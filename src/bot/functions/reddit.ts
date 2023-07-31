import {Bot} from "../Bot.js";
import {PlatformManager} from "../../common/contentPlatforms/PlatformManager.js";
import {MinimalVideoDetails} from "../../common/infrastructure/Atomic.js";
import {Video} from "../../common/db/models/video.js";
import {
    getOrInsertGuild,
    getOrInsertVideo,
    getRecentShowcasesByVideo,
    getRecentSubmissionsByVideo
} from "./repository.js";
import Submission from "snoowrap/dist/objects/Submission";
import Comment from "snoowrap/dist/objects/Comment";
import {RedditVideo} from "../../RedditClient.js";
import {Guild as DiscordGuild} from "discord.js";
import {Logger} from "@foxxmd/winston";
import {mergeArr, sleep} from "../../utils/index.js";
import dayjs from "dayjs";
import {addShowcaseVideo} from "./showcase.js";
import {MTVLogger} from "../../common/logging.js";

export const getHotToVideos = async (bot: Bot): Promise<RedditVideo[]> => {

    const hot = await bot.reddit.getHot();

    const manager = new PlatformManager(bot.config.credentials, bot.logger);

    const videos: RedditVideo[] = [];

    const extLinkSubmissions = hot.filter(x => !x.is_self && !x.is_video && !activityIsRemoved(x) && !activityIsFiltered(x)).slice(0, 5);

    for (const submission of extLinkSubmissions) {
            let video: Video;
            const [deets, urlDetails, existingVideo] = await manager.getVideoDetails(submission.url);
            if (existingVideo === undefined) {
                video = await getOrInsertVideo(deets as MinimalVideoDetails);
            } else {
                video = existingVideo;
            }
            videos.push({
                video,
                user: submission.author.name,
                url: `https://reddit.com${submission.permalink}`,
                submittedAt: dayjs.unix(submission.created)
            });
    }
    return videos;
}

export const processRedditToShowcase = async (dguild: DiscordGuild, videos: RedditVideo[], parentLogger: MTVLogger) => {
    const logger = parentLogger.child({labels: ['Reddit Hot']}, mergeArr);

    const guild = await getOrInsertGuild(dguild);

    logger.debug(`Checking r/mealtimevideos feed for submissions to showcase...`);

    for (const videoData of videos) {
        if (videoData.submittedAt.add(24, 'hours').isAfter(dayjs())) {
            // reddit submission is not yet 24 hours old
            logger.debug(`Skipping ${videoData.url} because it is not yet 24 hours old`);
            continue;
        }
        const recentSubmissions = await getRecentSubmissionsByVideo(guild, videoData.video);
        if (recentSubmissions.length > 0) {
            // this video was submitted to firehose within the last month
            logger.debug(`Skipping ${videoData.url} because it was submitted to firehose within the last month`);
            continue;
        }
        const recentShowcases = await getRecentShowcasesByVideo(guild, videoData.video);
        if (recentShowcases.length > 0) {
            // this video was showcased within the last month
            logger.debug(`Skipping ${videoData.url} because it was showcased within the last month`);
            continue;
        }

        await addShowcaseVideo(dguild, videoData.video, logger, {
            externalUrl: videoData.url,
            externalSubmitter: videoData.user
        });
        // prevent rate limiting
        await sleep(3000);
    }
}

export const activityIsRemoved = (item: Submission | Comment): boolean => {
    if(item.can_mod_post) {
        if (asSubmission(item)) {
            // when automod filters a post it gets this category
            return item.banned_at_utc !== null && item.removed_by_category !== 'automod_filtered';
        }
        // when automod filters a comment item.removed === false
        // so if we want to processing filtered comments we need to check for this
        return item.banned_at_utc !== null && item.removed;
    } else {
        if (asSubmission(item)) {
            return item.removed_by_category === 'moderator' || item.removed_by_category === 'deleted';
        }
        // in subreddits the bot does not mod it is not possible to tell the difference between a comment that was removed by the user and one that was removed by a mod
        return item.body === '[removed]';
    }
}

export const isSubmission = (value: any) => {
    try {
        return value !== null && typeof value === 'object' && (value instanceof Submission || ('name' in value && value.name !== undefined && value.name.includes('t3_')));
    } catch (e) {
        return false;
    }
}

export const asSubmission = (value: any): value is Submission => {
    return isSubmission(value);
}

export const isComment = (value: any) => {
    try {
        return value !== null && typeof value === 'object' && (value instanceof Comment || ('name' in value && value.name !== undefined && value.name.includes('t1_')));
    } catch (e) {
        return false;
    }
}

export const asComment = (value: any): value is Comment => {
    return isComment(value);
}

export const asActivity = (value: any): value is (Submission | Comment) => {
    return asComment(value) || asSubmission(value);
}

export const activityIsFiltered = (item: Submission | Comment): boolean => {
    if(item.can_mod_post) {
        if (asSubmission(item)) {
            // when automod filters a post it gets this category
            return item.banned_at_utc !== null && item.removed_by_category === 'automod_filtered';
        }
        // when automod filters a comment item.removed === false
        // so if we want to processing filtered comments we need to check for this
        return item.banned_at_utc !== null && !item.removed;
    }
    // not possible to know if its filtered if user isn't a mod so always return false
    return false;
}
