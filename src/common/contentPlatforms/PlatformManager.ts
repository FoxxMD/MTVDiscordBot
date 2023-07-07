import {Credentials} from "../infrastructure/OperatorConfig.js";
import {YoutubeClient} from "./clients/YoutubeClient.js";
import {
    ApiSupportedPlatforms,
    FullCreatorDetails,
    MinimalCreatorDetails, Platform,
    VideoDetails
} from "../infrastructure/Atomic.js";
import {Logger} from "@foxxmd/winston";
import {mergeArr} from "../../utils/index.js";
import {ErrorWithCause} from "pony-cause";
import {urlParser} from './UrlParser.js';
import {VimeoClient} from "./clients/VimeoClient.js";
import {getCreatorByDetails, upsertVideoCreator} from "../../bot/functions/repository.js";
import {parseUrl} from "../../utils/StringUtils.js";

export class PlatformManager {

    protected credentials: Credentials;
    protected logger: Logger;

    protected youtube?: YoutubeClient;
    protected vimeo?: VimeoClient;

    constructor(creds: Credentials, logger: Logger) {
        this.credentials = creds;
        this.logger = logger.child({labels: ['Video Parser']}, mergeArr);

        if (this.credentials.youtube !== undefined) {
            this.youtube = new YoutubeClient(this.credentials.youtube);
        }
        if (this.credentials.vimeo !== undefined) {
            this.vimeo = new VimeoClient(this.credentials.vimeo);
        }
    }

    async getVideoDetails(urlVal: string) {
        const url = parseUrl(urlVal);
        let details: Partial<VideoDetails> = {
            id: url.toString(),
            url: url,
            platform: url.hostname
        };

        const urlDetails = urlParser.parse(url.toString());
        if (urlDetails !== undefined) {
            details.id = urlDetails.id;
            details.platform = urlDetails.provider as Platform;
            switch (urlDetails.provider) {
                case 'youtube':
                    if (this.youtube !== undefined) {
                        try {
                            details = await this.youtube.getVideoDetails(urlDetails.id);
                        } catch (e) {
                            this.logger.warn(new ErrorWithCause(`Unable to get video details for ${url}`, {cause: e}));
                        }
                    }
                    break;
                case 'vimeo':
                    if (this.vimeo !== undefined) {
                        try {
                            details = await this.vimeo.getVideoDetails(urlDetails.id);
                        } catch (e) {
                            this.logger.warn(new ErrorWithCause(`Unable to get video details for ${url}`, {cause: e}));
                        }
                    }
                    break;
            }
        }

        return details;
    }

    async getChannelDetails(platform: string, channelId: string): Promise<FullCreatorDetails | undefined> {
        let channelDetails: FullCreatorDetails;
        switch (platform) {
            case 'youtube':
                if (this.youtube !== undefined) {
                    channelDetails = await this.youtube.getChannelDetails(channelId);
                }
                break;
            case 'vimeo':
                if (this.vimeo !== undefined) {
                    channelDetails = await this.vimeo.getChannelDetails(channelId);
                }
                break;
        }
        return channelDetails;
    }

    async checkPopularity(platform: string, details: MinimalCreatorDetails) {
        const creator = await upsertVideoCreator(platform, details);
        if (creator.popular !== undefined) {
            return creator.popular;
        }
        if (!ApiSupportedPlatforms.includes(platform)) {
            // nothing we can do about this
            return undefined;
        }
        let channelDetails = await this.getChannelDetails(platform, details.id);
        creator.populateFromDetails(channelDetails);
        await creator.save();
        return creator.popular;
    }

}
