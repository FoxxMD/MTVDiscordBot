import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import isBetween from 'dayjs/plugin/isBetween.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import duration from 'dayjs/plugin/duration.js';
import dotenv from 'dotenv';
import {Logger} from "@foxxmd/winston";
import {getLogger} from "./common/logging.js";
import {parseConfigFromSources} from "./common/config/ConfigBuilder.js";

dayjs.extend(utc)
dayjs.extend(isBetween);
dayjs.extend(relativeTime);
dayjs.extend(duration);

dotenv.config();

let logger: Logger = getLogger({file: false}, 'init');

(async function () {
    try {
        const config = await parseConfigFromSources();
        logger = getLogger(config.logging);
        logger.info(`Discord token: ${config.credentials.discord}`);
    } catch (e) {
        logger.error('Exited with uncaught error');
        logger.error(e);
        process.kill(process.pid, 'SIGTERM');
    }
})();
