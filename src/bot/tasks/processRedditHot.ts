import {Bot} from "../Bot.js";
import {AsyncTask} from "toad-scheduler";
import {getActiveSubmissions, getOrInsertGuild} from "../functions/repository.js";
import { PromisePool } from '@supercharge/promise-pool'
import {mergeArr} from "../../utils/index.js";
import {getHotToVideos, processRedditToShowcase} from "../functions/reddit.js";

export const createRedditHotTask = (bot: Bot) => {
    const logger = bot.logger.child({labels: 'Reddit Hot Task'}, mergeArr);
    return new AsyncTask(
        'Reddit Hot',
        (): Promise<any> => {
            return PromisePool
                .withConcurrency(1)
                .for(bot.client.guilds.cache)
                .process(async ([id, dguild]) => {
                    const hotFeed = await getHotToVideos(bot);
                    await processRedditToShowcase(dguild, hotFeed, bot.logger);
                }).then(({results, errors}) => {
                    if (errors.length > 0) {
                        logger.error(`Encountered errors!`);
                        for(const err of errors) {
                            logger.error(err);
                        }
                    }
                });
        },
        (err: Error) => {
            bot.logger.error(err);
        }
    );
}
