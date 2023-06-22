import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc.js';
import isBetween from 'dayjs/plugin/isBetween.js';
import relativeTime from 'dayjs/plugin/relativeTime.js';
import duration from 'dayjs/plugin/duration.js';
import dotenv from 'dotenv';
import {Logger} from "@foxxmd/winston";
import {getLogger} from "./common/logging.js";
import {parseConfigFromSources} from "./common/config/ConfigBuilder.js";
import {initDB} from "./common/db/index.js";
import {dataDir} from "./common/index.js";
import {User} from "./common/db/models/user.js";
import {VideoSubmission} from "./common/db/models/videosubmission.js";
import {Video} from "./common/db/models/video.js";
import {Creator} from "./common/db/models/creator.js";

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

        const db = await initDB(config);

        const [user] = await User.upsert({
            name: 'foxxmd#0'
        });

        const [creator] = await Creator.upsert({
            platform: 'youtube',
                platformId: '555',
                name: 'TEST',
                nsfw: false
        });
        const [video] = await Video.upsert({
            platform: 'youtube',
            platformId: '12345',
            length: 1234,
            nsfw: false,
            creatorId: creator.id
        });
        const [submission] = await VideoSubmission.upsert({
            messageId: '1234',
            guildId: '123',
            userId: user.id,
            videoId: video.id
        });

        const hydratedUser = await User.findOne({where: {id: 1}, include: {all: true, nested: true}});
        const f = 1;
    } catch (e) {
        logger.error('Exited with uncaught error');
        logger.error(e);
        process.kill(process.pid, 'SIGTERM');
    }
})();
