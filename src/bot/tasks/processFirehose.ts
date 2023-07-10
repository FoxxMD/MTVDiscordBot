import {AsyncTask} from "toad-scheduler";
import {processFirehoseVideos} from "../functions/firehose.js";
import {Bot} from "../Bot.js";
import {PromisePool} from '@supercharge/promise-pool'
import {mergeArr} from "../../utils/index.js";

export const createProcessFirehoseTask = (bot: Bot) => {
    const logger = bot.logger.child({labels: 'Firehose Task'}, mergeArr);
    return new AsyncTask(
        'Process Firehose',
        () => {
            return PromisePool
                .withConcurrency(1)
                .for(bot.client.guilds.cache)
                .process(async ([id, dguild]) => {
                    await processFirehoseVideos(dguild, bot.logger)
                }).then(({results, errors}) => {
                    if (errors.length > 0) {
                        logger.error(`Encountered errors!`);
                        for (const err of errors) {
                            logger.error(err);
                        }
                    }
                })
        },
        (err: Error) => {
            bot.logger.error(err);
        }
    )
}
