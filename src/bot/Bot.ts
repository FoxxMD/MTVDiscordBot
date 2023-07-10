import {BotClient} from "../BotClient.js";
import {Sequelize} from "sequelize";
import {Logger} from "@foxxmd/winston";
import {mergeArr} from "../utils/index.js";
import {OperatorConfig} from "../common/infrastructure/OperatorConfig.js";
import {initCommands, registerGuildCommands} from "../command/handler.js";
import {Events, TextChannel} from "discord.js";
import {logLevels} from "../common/logging.js";
import {getOrInsertGuild, getOrInsertVideo, getVideoByVideoId} from "./functions/repository.js";
import {AsyncTask, SimpleIntervalJob, ToadScheduler} from "toad-scheduler";
import {createProcessFirehoseTask} from "./tasks/processFirehose.js";
import {createHeartbeatTask} from "./tasks/heartbeat.js";
import {RedditClient} from "../RedditClient.js";
import {ErrorWithCause} from "pony-cause";
import {createRedditHotTask} from "./tasks/processRedditHot.js";

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
}
