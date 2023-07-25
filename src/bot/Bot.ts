import {BotClient} from "../BotClient.js";
import {Sequelize} from "sequelize";
import {Logger} from "@foxxmd/winston";
import {difference, mergeArr} from "../utils/index.js";
import {OperatorConfig} from "../common/infrastructure/OperatorConfig.js";
import {buildCommands, initCommands, initEvents, registerGuildCommands} from "../command/handler.js";
import {Events, Guild as DiscordGuild, TextBasedChannel, TextChannel, userMention} from "discord.js";
import {isLogLineMinLevel, logLevels, MTVLogger} from "../common/logging.js";
import {getOrInsertGuild, getOrInsertVideo, getVideoByVideoId} from "./functions/repository.js";
import {AsyncTask, SimpleIntervalJob, ToadScheduler} from "toad-scheduler";
import {createProcessFirehoseTask} from "./tasks/processFirehose.js";
import {createHeartbeatTask} from "./tasks/heartbeat.js";
import {RedditClient} from "../RedditClient.js";
import {ErrorWithCause} from "pony-cause";
import {createRedditHotTask} from "./tasks/processRedditHot.js";
import {LogInfo} from "../common/infrastructure/Atomic.js";
import {Guild} from "../common/db/models/Guild.js";
import {MESSAGE, SPLAT} from "triple-beam";
import {GuildSettings} from "../common/db/models/GuildSettings.js";
import {detectErrorStack} from "../utils/StringUtils.js";
import ReadableStream = NodeJS.ReadableStream;
import {buildLogStatement} from "./utils/embedUtils.js";
import {commaListsAnd} from "common-tags";

export class Bot {
    public client: BotClient;
    public db: Sequelize;
    public logger: MTVLogger;
    public config: OperatorConfig;
    public reddit?: RedditClient;
    public guilds: Guild[] = [];

    constructor(client: BotClient, db: Sequelize, logger: MTVLogger, config: OperatorConfig) {
        this.client = client;
        this.db = db;
        this.logger = logger.child({labels: ['Bot']}, mergeArr);
        this.config = config;
    }

    async init(logger: Logger) {

        const scheduler = new ToadScheduler()

        try {
            const slashData = await buildCommands(this.client, this);

            const cr = new Promise((resolve, reject) => {
                this.client.once(Events.ClientReady, (msg) => {
                    this.logger.info(`Logged in as ${this.client.user.tag}`);
                    resolve(true);
                });
            });

            const sr = new Promise((resolve, reject) => {
                this.client.once(Events.ShardReady, (msg) => {
                    this.logger.debug(`Shard ${msg} READY`);
                    resolve(true);
                });
            })

            this.client.on(Events.GuildCreate, (guild) => {
                const f = 1;
            })


            await this.client.login(this.config.credentials.discord.token);

            await Promise.all([
                cr,
                sr,
            ]);
            logger.info('Bot is now ready to init');
            this.setupChannelLogging(this.logger.stream());

            for (const [id, dguild] of this.client.guilds.cache) {
                let guild: Guild;
                if(this.config.guilds !== undefined) {
                    if(this.config.guilds.some(x => x === id)) {
                        guild = await getOrInsertGuild(dguild, this.logger);
                        this.guilds.push(guild);
                    } else {
                        this.logger.warn(`Guild ${id} (${dguild.name}) not included in config, will not register for bot interaction`);
                    }
                } else {
                    guild = await getOrInsertGuild(dguild, this.logger);
                    this.guilds.push(guild);
                }

                if(guild !== undefined) {
                    await registerGuildCommands(this.config.credentials.discord, guild.id, slashData, this.logger);
                }
            }
            if(this.config.guilds !== undefined) {
                const registeredGuildIds = this.guilds.map(x => x.id);
                const unregisteredIds = difference<string>(this.config.guilds, registeredGuildIds);
                if(unregisteredIds.size > 0) {
                    this.logger.warn(commaListsAnd`Guilds ids defined in config but Bot has not joined: ${Array.from(unregisteredIds.values())}`);
                }
            }

            await initCommands(this.client, this);
            await initEvents(this.client, this);

            this.logger.info('Bot Init complete');

            if (this.config.credentials.reddit !== undefined) {
                this.logger.info('Init reddit client');
                try {
                    this.reddit = new RedditClient(this.config.credentials.reddit);
                    await this.reddit.init();
                    this.logger.info('Reddit client ready');
                } catch (e) {
                    this.logger.error(new ErrorWithCause('Failed to init reddit', {cause: e}));
                }
            }

            this.logger.info('Starting scheduler...');

            scheduler.addSimpleIntervalJob(new SimpleIntervalJob({
                minutes: 30,
                runImmediately: true
            }, createHeartbeatTask(this)))

            scheduler.addSimpleIntervalJob(new SimpleIntervalJob({
                minutes: 5,
                runImmediately: true
            }, createProcessFirehoseTask(this)));

            if (this.reddit !== undefined && this.reddit.ready) {
                scheduler.addSimpleIntervalJob(new SimpleIntervalJob({
                    minutes: 60,
                    runImmediately: true
                }, createRedditHotTask(this)));
            }


            this.logger.info('Scheduler started.');
        } catch (e) {
            scheduler.stop();
            throw e;
        }
    }

    setupChannelLogging(stream: ReadableStream) {
        const logger = this.logger.child({labels: ['Channels']}, mergeArr);
        stream.on('log', async (log: LogInfo) => {
            if (log.sendToGuild !== undefined) {
                const {
                    discordGuild,
                    guild: mtvGuild,
                    byDiscordUser,
                    toChannel,
                } = log;
                let guild: Guild;
                if (mtvGuild !== undefined) {
                    if (mtvGuild instanceof Guild) {
                        guild = mtvGuild;
                    } else {
                        guild = await Guild.findByPk(mtvGuild);
                    }
                }
                if (guild === undefined && discordGuild !== undefined) {
                    if (discordGuild instanceof DiscordGuild) {
                        guild = await getOrInsertGuild(discordGuild);
                    } else {
                        try {
                            const dguild = await this.client.guilds.fetch(discordGuild);
                            guild = await getOrInsertGuild(dguild);
                        } catch (e) {
                            logger.warn(`Could not log to Discord because given Guild ID does not exist: ${discordGuild}`);
                            return;
                        }
                    }
                }
                if (guild === undefined && toChannel === undefined) {
                    logger.warn('Could not resolve Guild for logging!', {[SPLAT]: {discordGuild, guild}});
                    return;
                }
                let channelId: string;
                let channelName: string;
                let channel: TextBasedChannel;

                if (toChannel !== undefined) {
                    if (typeof toChannel === 'string') {
                        channelId = toChannel;
                        channelName = toChannel;
                    } else {
                        channelId = toChannel.id;
                        channelName = toChannel.toString();
                        channel = toChannel;
                    }
                } else {
                    if (isLogLineMinLevel(log, 'warn')) {
                        channelName = GuildSettings.ERROR_CHANNEL;
                    } else if (log.level === 'safety') {
                        channelName = GuildSettings.SAFETY_CHANNEL;
                    } else {
                        channelName = GuildSettings.LOGGING_CHANNEL;
                    }
                    channelId = await guild.getSettingValue<string>(channelName);
                    if (channelId === undefined) {
                        this.logger.warn(`No value set for logging Channel '${channelName}'!`, {[SPLAT]: {guild: guild.id}});
                        return;
                    }
                }

                if (channel === undefined) {
                    try {
                        channel = await this.client.channels.fetch(channelId) as TextBasedChannel;
                    } catch (e) {
                        logger.warn(new ErrorWithCause(`Unable to fetch Channel ${channelId} (${channelName}) for Guild ${guild.id}`, {cause: e}));
                        return;
                    }
                }

                try {
                    const embed = await buildLogStatement(log, {guildId: guild !== undefined ? guild.id : undefined});
                    await channel.send({embeds: [embed]});
                } catch (e) {
                    logger.warn(new ErrorWithCause(`Error occurred while sending log to Channel ${channelId} (${channelName}) for Guild ${guild.id}`, {cause: e}));
                }
            }
        });
    }

    shouldInteract = (guildId: string) => {
        return this.guilds.some(x => x.id === guildId);
    }
}
