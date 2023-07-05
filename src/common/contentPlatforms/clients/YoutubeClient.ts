import {youtube, youtube_v3} from '@googleapis/youtube';
import Schema$Video = youtube_v3.Schema$Video;
import Schema$Channel = youtube_v3.Schema$Channel;
import {parseUsableLinkIdentifier} from "../../../utils/StringUtils.js";
import {FullCreatorDetails, MinimalVideoDetails, VideoDetails} from "../../infrastructure/Atomic.js";
import {SimpleError} from "../../../utils/Errors.js";
import {ErrorWithCause} from "pony-cause";
import dayjs from "dayjs";

const parseYtIdentifier = parseUsableLinkIdentifier();

export class YoutubeClient {
    apiKey: string;
    client: youtube_v3.Youtube

    constructor(key: string) {
        this.apiKey = key;
        this.client = youtube({version: 'v3', auth: key});
    }

    getVideo = async (videoId: string): Promise<Schema$Video | undefined> => {

        const res = await this.client.videos.list({
            part: ['snippet', 'contentDetails', 'statistics'],
            id: [videoId],
            maxResults: 1,
        });
        if (res.data.items.length > 0) {
            return res.data.items[0];
        }
        throw new SimpleError(`No Youtube video found with ID ${videoId}`);
    }

    getChannel = async (channelId: string): Promise<Schema$Channel | undefined> => {

        const res = await this.client.channels.list({
            part: ['snippet', 'contentDetails', 'statistics'],
            id: [channelId],
            maxResults: 1,
        });
        if (res.data.items.length > 0) {
            return res.data.items[0];
        }
        throw new SimpleError(`No Youtube channel found with ID ${channelId}`);
    }

    getVideoDetails = async (videoId: string): Promise<MinimalVideoDetails> => {
        try {
            const video = await this.getVideo(videoId);

            return {
                id: videoId,
                platform: 'youtube',
                url: `https://www.youtube.com/watch?v=${videoId}`,
                nsfw: video.contentDetails.contentRating?.ytRating === 'ytAgeRestricted',
                title: video.snippet.title,
                creator: {
                    id: video.snippet.channelId,
                    name: video.snippet.channelTitle
                },
                duration: dayjs.duration(video.contentDetails.duration).asSeconds()
            }
        } catch (e) {
            throw new ErrorWithCause(`Unable to get details for Youtube video with ID ${videoId}`, {cause: e});
        }
    }

    getChannelDetails = async (channelId: string): Promise<FullCreatorDetails | undefined> => {
        try {
            const channel = await this.getChannel(channelId);

            return {
                id: channelId,
                name: channel.snippet.title,
                followers: Number.parseInt(channel.statistics.subscriberCount),
                createdAt: dayjs(channel.snippet.publishedAt).toDate(),
            }

        } catch (e) {
            throw new ErrorWithCause(`Unable to get details for Youtube Channel with ID ${channelId}`, {cause: e});
        }
    }
}
