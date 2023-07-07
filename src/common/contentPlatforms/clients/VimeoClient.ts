import {FullCreatorDetails, MinimalVideoDetails, VideoDetails} from "../../infrastructure/Atomic.js";
import {SimpleError} from "../../../utils/Errors.js";
import {ErrorWithCause} from "pony-cause";
import {VimeoCredentials} from "../../infrastructure/OperatorConfig.js";
import {Vimeo} from "@vimeo/vimeo";
import {VimeoUserFull, VimeoResponse, VimeoVideo} from "../../infrastructure/Vimeo.js";
import dayjs from "dayjs";

export class VimeoClient {
    client: Vimeo;

    constructor(creds: VimeoCredentials) {
        this.client = new Vimeo(creds.clientId, creds.clientSecret, creds.token);
    }

    getVideo = async (videoId: string): Promise<VimeoResponse<VimeoVideo> | undefined> => {

        try {
            // @ts-ignore
            const res: VimeoResponse<VimeoVideo> = await this.client.request(`/videos/${videoId}`);
            return res;
        } catch (e) {
            try {
                const msg = JSON.parse(e.message);
                if (msg.error !== undefined) {
                    if (msg.error.includes('be found')) {
                        // video couldn't be found
                        throw new SimpleError(`No Vimeo video found with ID ${videoId}`);
                    }
                    throw new ErrorWithCause(`Vimeo encountered an error: ${msg.error}`, {cause: e});
                }
            } catch (ee) {
                // message isn't json!
            }
            throw new ErrorWithCause('Vimeo encountered an error', {cause: e});
        }
    }

    getVideoDetails = async (videoId: string): Promise<MinimalVideoDetails> => {
        try {
            const resp = await this.getVideo(videoId);

            return {
                id: videoId,
                platform: 'vimeo',
                url: new URL(resp.body.link),
                nsfw: resp.body.content_rating_class !== 'safe',
                title: resp.body.name,
                creator: {
                    id: resp.body.user.uri.replace('/users/', ''),
                    name: resp.body.user.name
                },
                duration: resp.body.duration
            }
        } catch (e) {
            throw new ErrorWithCause(`Unable to get details for Vimeo video with ID ${videoId}`, {cause: e});
        }
    }

    getChannel = async (userId: string): Promise<VimeoResponse<VimeoUserFull>> => {
        try {
            // @ts-ignore
            const res: VimeoResponse<VimeoUserFull> = await this.client.request(`/users/${userId}`);
            return res;
        } catch (e) {
            try {
                const msg = JSON.parse(e.message);
                if (msg.error !== undefined) {
                    if (msg.error.includes('be found')) {
                        // video couldn't be found
                        throw new SimpleError(`No Vimeo User found with ID ${userId}`);
                    }
                    throw new ErrorWithCause(`Vimeo encountered an error: ${msg.error}`, {cause: e});
                }
            } catch (ee) {
                // message isn't json!
            }
            throw new ErrorWithCause('Vimeo encountered an error', {cause: e});
        }
    }

    getChannelDetails = async (channelId: string): Promise<FullCreatorDetails | undefined> => {
        try {
            const resp = await this.getChannel(channelId);

            return {
                id: channelId,
                name: resp.body.name,
                createdAt: dayjs(resp.body.created_time).toDate(),
                followers: resp.body.metadata.connections.followers.total
            }
        } catch (e) {
            throw new ErrorWithCause(`Unable to get details for Vimeo channel with ID ${channelId}`, {cause: e});
        }
    }
}
