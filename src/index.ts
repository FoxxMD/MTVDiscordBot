import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import isBetween from 'dayjs/plugin/isBetween.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import duration from 'dayjs/plugin/duration.js';
import dotenv from 'dotenv';
import {Logger} from "@foxxmd/winston";
import {getLogger, isLogLineMinLevel, logLevels} from "./common/logging.js";
import {parseConfigFromSources} from "./common/config/ConfigBuilder.js";
import {initDB} from "./common/db/index.js";
import {dataDir} from "./common/index.js";
import {Events, GatewayIntentBits} from "discord.js";
import {BotClient} from "./BotClient.js";
import {Bot} from "./bot/Bot.js";
import {mergeArr} from "./utils/index.js";
import {sandbox} from "./common/db/test.js";

dayjs.extend(utc)
dayjs.extend(isBetween);
dayjs.extend(relativeTime);
dayjs.extend(duration);

dotenv.config();

let logger: Logger = getLogger({file: false}, 'init');
logger.debug(`Data Dir ENV: ${process.env.DATA_DIR} -> Resolved: ${dataDir}`);

(async function () {
    try {
        const config = await parseConfigFromSources();
        const {
            logging = {},
            logging: {
                discord = 'error'
            } = {},
        } = config;


        logger = getLogger(logging);

        const client = new BotClient({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions,
                GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                //GatewayIntentBits.GuildModeration
            ]
        });
        client.initLogging(discord, logger);
        const db = await initDB(config);


        const bot = new Bot(client, db, logger, config);
        bot.init(logger);

        //await pEvent(client, 'NEVER');
        const f = 1;
    } catch (e) {
        logger.error('Exited with uncaught error');
        logger.error(e);
        process.kill(process.pid, 'SIGTERM');
    }
})();
