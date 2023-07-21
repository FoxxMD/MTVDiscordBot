import {Client, Collection, Events} from "discord.js";
import {Logger} from "@foxxmd/winston";
import {LogLevel} from "./common/infrastructure/Atomic.js";
import {logLevels, MTVLogger} from "./common/logging.js";
import {mergeArr} from "./utils/index.js";

export class BotClient extends Client {
    commands: Collection<any, any>
    initLogging = (level: LogLevel, logger: MTVLogger) => {

        const clientLogger = logger.child({labels: ['Discord']}, mergeArr);

        this.on(Events.Error, (e) => {
            if (logLevels[level] >= logLevels.error) {
                clientLogger.error(e);
            }
            throw e;
        });
        if (logLevels[level] >= logLevels.debug) {
            this.on(Events.Debug, (msg) => {
                clientLogger.debug(msg);
            });
            this.on(Events.Raw, (msg) => {
                clientLogger.debug(`Event => ${msg.t}`);
            });
        }

        if (logLevels[level] >= logLevels.warn) {
            this.on(Events.Warn, (msg) => {
                clientLogger.warn(msg);
            });
        }
    }
}
