import {getLogger} from "./logging.js";
import path from "path";
import {dataDir} from "./index.js";
import {Sequelize} from "sequelize";
import {OperatorConfig} from "./infrastructure/OperatorConfig.js";
import {fileOrDirectoryIsWriteable} from "../utils/io.js";

export const createDb = (config: OperatorConfig) => {
    const logger = getLogger(config.logging, 'DB');

    let dbPath = path.resolve(dataDir, `db.sqlite`);

    logger.debug(`Location: ${dbPath}`);
    try {
        fileOrDirectoryIsWriteable(dbPath)
    } catch (e) {
        logger.warn('Unable to access DB file location! Will use MEMORY sqlite database instead. Your database will be wiped when the application is stopped.');
        logger.warn(e);
        dbPath = ':memory:';
    }

    const {
        logging: {
            db = false
        } = {}
    } = config;

    let logOption: ((msg: string) => void) | boolean = false;
    if (db !== false) {
        logOption = (msg: string) => logger.debug(msg);
    }

    const sequelize = new Sequelize({
        dialect: 'sqlite',
        storage: dbPath,
        logging: logOption
    });

    return sequelize;
}
