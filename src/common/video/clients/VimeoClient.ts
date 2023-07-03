import {VideoDetails} from "../../infrastructure/Atomic.js";
import {SimpleError} from "../../../utils/Errors.js";
import {ErrorWithCause} from "pony-cause";
import {VimeoCredentials} from "../../infrastructure/OperatorConfig.js";
import {Vimeo} from "@vimeo/vimeo";
import {VimeoResponse} from "../../infrastructure/Vimeo.js";

export class VimeoClient {
    client: Vimeo;

    constructor(creds: VimeoCredentials) {
        this.client = new Vimeo(creds.clientId, creds.clientSecret, creds.token);
    }

    getVideo = async (videoId: string): Promise<VimeoResponse | undefined> => {

        try {
            // @ts-ignore
            const res: VimeoResponse = await this.client.request(`/videos/${videoId}`);
            return res;
        } catch (e) {
            try {
                const msg = JSON.parse(e.message);
                if(msg.error !== undefined) {
                    if(msg.error.includes('be found')) {
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

    getVideoDetails = async (videoId: string): Promise<VideoDetails> => {
        try {
            const resp = await this.getVideo(videoId);

            return {
                id: videoId,
                platform: 'vimeo',
                url: resp.body.link,
                nsfw: resp.body.content_rating_class !== 'safe',
                title: resp.body.name,
                authorName: resp.body.user.name,
                authorId: resp.body.user.uri,
                duration: resp.body.duration
            }
        } catch (e) {
            throw new ErrorWithCause(`Unable to get details for Youtube video with ID ${videoId}`, {cause: e});
        }
    }
}
