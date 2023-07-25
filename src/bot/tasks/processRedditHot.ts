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
                .for(bot.guilds)
                .process(async (guild) => {
                    const logger = bot.logger.child({labels: [`Guild ${guild.id}`]}, mergeArr);
                    const dguild = await bot.client.guilds.fetch(guild.id);
                    const hotFeed = await getHotToVideos(bot);
                    await processRedditToShowcase(dguild, hotFeed, logger);
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
