import {BotClient} from "../BotClient.js";
import {Sequelize} from "sequelize";
import {Logger} from "@foxxmd/winston";
import {mergeArr} from "../utils/index.js";
import {OperatorConfig} from "../common/infrastructure/OperatorConfig.js";
import {initCommands, registerGuildCommands} from "../command/handler.js";
import {Events, TextChannel} from "discord.js";
import {logLevels} from "../common/logging.js";
import {getOrInsertGuild} from "./functions/repository.js";
import {AsyncTask, SimpleIntervalJob, ToadScheduler} from "toad-scheduler";
import {processFirehoseVideos} from "./functions/firehose.js";
import {scheduler} from "timers/promises";

export class Bot {
    protected client: BotClient;
    public db: Sequelize;
    public logger: Logger;
    public config: OperatorConfig;

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

            this.logger.info('Starting scheduler...');

            const task = new AsyncTask(
                'Process Firehose',
                () => {
                    for(const [id, guild] of this.client.guilds.cache) {
                        return processFirehoseVideos(guild, this.logger).then();
                    }
                },
                (err: Error) => {
                    this.logger.error(err);
                }
            )
            const job = new SimpleIntervalJob({ seconds: 30, }, task)
            scheduler.addSimpleIntervalJob(job);

            this.logger.info('Scheduler started.');
        } catch (e) {
            scheduler.stop();
            throw e;
        }
    }
}
