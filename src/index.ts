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
//import {initCommands, registerGuildCommands} from "./command/handler.js";
import {Events, GatewayIntentBits} from "discord.js";
import {BotClient} from "./BotClient.js";
import pEvent from 'p-event'
import {Bot} from "./bot/Bot.js";
import {mergeArr} from "./utils/index.js";
import {initCommands} from "./command/handler.js";

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
        logger = getLogger(config.logging);

        const client = new BotClient({
            intents: [
                GatewayIntentBits.Guilds,
                GatewayIntentBits.MessageContent,
                GatewayIntentBits.GuildMessageReactions,
                //GatewayIntentBits.GuildMembers,
                GatewayIntentBits.GuildMessages,
                //GatewayIntentBits.GuildModeration
            ]
        })
//1411165318208
        const db = await initDB(config);

        const clientLogger = logger.child({labels: ['Discord']}, mergeArr);

        const {
            logging: {
                discord = 'error'
            } = {}
        } = config;

        //const slashData = await initCommands(client, config.credentials.discord, db, logger);

        client.on(Events.Error, (e) => {
            if (logLevels[discord] >= logLevels.error) {
                clientLogger.error(e);
            }
            throw e;
        });
        if (logLevels[discord] >= logLevels.debug) {
            client.on(Events.Debug, (msg) => {
                clientLogger.debug(msg);
            });
        }

        if (logLevels[discord] >= logLevels.warn) {
            client.on(Events.Warn, (msg) => {
                clientLogger.warn(msg);
            });
        }

        const cr = new Promise((resolve, reject) => {
            client.once(Events.ClientReady, (msg) => {
                clientLogger.debug(`Logged in as ${client.user.tag}`);
                resolve(true);
            });
        });

        const sr = new Promise((resolve, reject) => {
            client.once(Events.ShardReady, (msg) => {
                clientLogger.debug(`Shard ${msg} READY`);
                resolve(true);
            });
        })


        await client.login(config.credentials.discord.token);

        await Promise.all([
            cr,
            sr,
        ]);
        logger.info('Bot is now ready to init');
        const bot = new Bot(client, db, logger, config);
        bot.init();

        //await pEvent(client, 'NEVER');
        const f = 1;
    } catch (e) {
        logger.error('Exited with uncaught error');
        logger.error(e);
        process.kill(process.pid, 'SIGTERM');
    }
})();
