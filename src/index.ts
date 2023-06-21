import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import isBetween from 'dayjs/plugin/isBetween.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import duration from 'dayjs/plugin/duration.js';
import dotenv from 'dotenv';
import {Logger} from "@foxxmd/winston";
import {getLogger} from "./common/logging.js";
import {parseConfigFromSources} from "./common/config/ConfigBuilder.js";
import {createDb} from "./common/db.js";
import {dataDir} from "./common/index.js";

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
        logger.info(`Discord token: ${config.credentials.discord}`);

        const db = createDb(config);
        const version = await db.databaseVersion();
        logger.info(version);
    } catch (e) {
        logger.error('Exited with uncaught error');
        logger.error(e);
        process.kill(process.pid, 'SIGTERM');
    }
})();
