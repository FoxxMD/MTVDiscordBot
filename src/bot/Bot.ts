import {BotClient} from "../BotClient.js";
import {Sequelize} from "sequelize";
import {Logger} from "@foxxmd/winston";
import {hydrateStaff} from "./functions/hydrateStaff.js";
import {mergeArr} from "../utils/index.js";
import {OperatorConfig} from "../common/infrastructure/OperatorConfig.js";
import {initCommands, registerGuildCommands} from "../command/handler.js";

export class Bot {
    protected client: BotClient;
    protected db: Sequelize;
    protected logger: Logger;
    protected config: OperatorConfig;

    constructor(client: BotClient, db: Sequelize, logger: Logger, config: OperatorConfig) {
        this.client = client;
        this.db = db;
        this.logger = logger.child({labels: ['Bot']}, mergeArr);
        this.config = config;
    }

    async init() {
        const slashData = await initCommands(this.client, this.config.credentials.discord, this.db, this.logger);
        for (const [id, guild] of this.client.guilds.cache) {
            //await hydrateStaff(guild, this.db, this.logger);
            await registerGuildCommands(this.config.credentials.discord, guild.id, slashData, this.logger);
        }
        this.logger.info('Bot Init complete');
    }
}
