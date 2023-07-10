import {Bot} from "../Bot.js";
import {AsyncTask} from "toad-scheduler";
import {getActiveSubmissions, getOrInsertGuild} from "../functions/repository.js";
import { PromisePool } from '@supercharge/promise-pool'
import {mergeArr} from "../../utils/index.js";

export const createHeartbeatTask = (bot: Bot) => {
    const logger = bot.logger.child({labels: 'Heartbeat'}, mergeArr);
    return new AsyncTask(
        'Heartbeat',
        (): Promise<any> => {
            let activeCount = 0;
            return PromisePool
                .withConcurrency(2)
                .for(bot.client.guilds.cache)
                .process(async ([id, dguild]) => {
                    const guild = await getOrInsertGuild(dguild);
                    const active = await getActiveSubmissions(guild);
                    return active.length;
                }).then(({results, errors}) => {
                    if (errors.length > 0) {
                        logger.error(`Encountered errors!`);
                        for(const err of errors) {
                            logger.error(err);
                        }
                    } else {
                        logger.info(`Found ${results.reduce((acc, curr) => acc + curr,0)} active submissions across ${bot.client.guilds.cache.size} guilds`);
                    }
                });
        },
        (err: Error) => {
            bot.logger.error(err);
        }
    );
}
