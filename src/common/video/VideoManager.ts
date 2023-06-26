import {Credentials} from "../infrastructure/OperatorConfig.js";
import {YoutubeClient} from "./clients/YoutubeClient.js";
import {VideoDetails} from "../infrastructure/Atomic.js";
import {Logger} from "@foxxmd/winston";
import {mergeArr} from "../../utils/index.js";
import {ErrorWithCause} from "pony-cause";
import urlParser from "js-video-url-parser";

export class VideoManager {

    protected credentials: Credentials;
    protected logger: Logger;

    protected youtube?: YoutubeClient;

    constructor(creds: Credentials, logger: Logger) {
        this.credentials = creds;
        this.logger = logger.child({labels: ['Video Parser']}, mergeArr);

        if (this.credentials.youtube !== undefined) {
            this.youtube = new YoutubeClient(this.credentials.youtube);
        }
    }

    async getVideoDetails(url: string) {
        let details: Partial<VideoDetails> = {
            id: url,
            url
        };

        const urlDetails = urlParser.parse(url);
        if (urlDetails !== undefined && urlDetails.provider === 'youtube') {
            details.id = urlDetails.id;
            details.platform = 'youtube';
            if (this.youtube !== undefined) {
                try {
                    details = await this.youtube.getVideoDetails(urlDetails.id);
                } catch (e) {
                    this.logger.warn(new ErrorWithCause(`Unable to get video details for ${url}`, {cause: e}));
                }
            }
        }

        return details;
    }

}
