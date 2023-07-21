import {BotClient} from "../BotClient.js";
import {Sequelize} from "sequelize";
import {Logger} from "@foxxmd/winston";
import {mergeArr} from "../utils/index.js";
import {OperatorConfig} from "../common/infrastructure/OperatorConfig.js";
import {initCommands, initEvents, registerGuildCommands} from "../command/handler.js";
import {Events, Guild as DiscordGuild, TextBasedChannel, TextChannel, userMention} from "discord.js";
import {isLogLineMinLevel, logLevels} from "../common/logging.js";
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

export class Bot {
    public client: BotClient;
    public db: Sequelize;
    public logger: Logger;
    public config: OperatorConfig;
    public reddit?: RedditClient;

    constructor(client: BotClient, db: Sequelize, logger: Logger, config: OperatorConfig) {
        this.client = client;
        this.db = db;
        this.logger = logger.child({labels: ['Bot']}, mergeArr);
        this.config = config;
    }

    async init(logger: Logger) {

        const scheduler = new ToadScheduler()

        try {
            const slashData = await initCommands(this.client, this.config.credentials.discord, this);

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

            await initEvents(this.client, this);

            for (const [id, guild] of this.client.guilds.cache) {
                await getOrInsertGuild(guild, this.logger);
                await registerGuildCommands(this.config.credentials.discord, guild.id, slashData, this.logger);
            }
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
                    // let cleanedMessage = log[MESSAGE]
                    //     .slice(26) // remove timestamp since discord has their own on message
                    //     .replace(/^(\w+)\s*:/, '$1:') // remove whitespace from level padding
                    //     .replace(`[Guild ${guild.id}]`, `${byDiscordUser !== undefined ? `[${userMention(byDiscordUser)}]` : ''}`) // remove guild label since we will be reading it in the guild anyway and replace with user who executed, if provided
                    //     .slice(0, 1999); // make sure not to hit message character limit
                    // const stackRes = detectErrorStack(cleanedMessage);
                    // if (stackRes !== undefined) {
                    //     cleanedMessage = `${cleanedMessage.slice(0, stackRes.index)}\n\`\`\`${cleanedMessage.slice(stackRes.index)}\`\`\``
                    // }
                    // await channel.send({content: cleanedMessage});
                    const embed = await buildLogStatement(log, {guildId: guild !== undefined ? guild.id : undefined});
                    await channel.send({embeds: [embed]});
                } catch (e) {
                    logger.warn(new ErrorWithCause(`Error occurred while sending log to Channel ${channelId} (${channelName}) for Guild ${guild.id}`, {cause: e}));
                }
            }
        });
    }
}
