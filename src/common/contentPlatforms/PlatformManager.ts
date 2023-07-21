import {Credentials} from "../infrastructure/OperatorConfig.js";
import {YoutubeClient} from "./clients/YoutubeClient.js";
import {
    AllowedVideoProviders,
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
import {getCreatorByDetails, getVideoByVideoId, upsertVideoCreator} from "../../bot/functions/repository.js";
import {parseUrl} from "../../utils/StringUtils.js";
import {Video} from "../db/models/video.js";
import {VideoInfo} from "js-video-url-parser/lib/urlParser.js";
import {Creator} from "../db/models/creator.js";
import {MTVLogger} from "../logging.js";

export class PlatformManager {

    protected credentials: Credentials;
    protected logger: MTVLogger;

    protected youtube?: YoutubeClient;
    protected vimeo?: VimeoClient;

    constructor(creds: Credentials, logger: MTVLogger) {
        this.credentials = creds;
        this.logger = logger.child({labels: ['Video Parser']}, mergeArr);

        if (this.credentials.youtube !== undefined) {
            this.youtube = new YoutubeClient(this.credentials.youtube);
        }
        if (this.credentials.vimeo !== undefined) {
            this.vimeo = new VimeoClient(this.credentials.vimeo);
        }
    }

    async getVideoDetails(urlVal: string, includeCreator?: boolean): Promise<[ Partial<VideoDetails>, VideoInfo<Record<string, any>, string>?, Video?, Creator?]> {
        const url = parseUrl(urlVal);
        let details: Partial<VideoDetails> = {
            id: url.toString(),
            url: url,
            platform: url.hostname
        };

        const urlDetails = urlParser.parse(url.toString());
        if (urlDetails !== undefined) {
            const existingVideo = await getVideoByVideoId(urlDetails.id, urlDetails.provider);
            if(existingVideo !== undefined) {
                details = await existingVideo.toVideoDetails();
                const creator = await existingVideo.getCreator();
                return [details, urlDetails, existingVideo, creator];
            }
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

        let creator: Creator | undefined;
        if(includeCreator && details.creator?.id !== undefined && AllowedVideoProviders.includes(details.platform)) {
            creator = await this.upsertCreatorFromDetails(details.platform, details.creator as MinimalCreatorDetails);
        }

        return [details, urlDetails, undefined, creator];
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
            return creator.isPopular();
        }
        if (!ApiSupportedPlatforms.includes(platform)) {
            // nothing we can do about this
            return undefined;
        }
        let channelDetails = await this.getChannelDetails(platform, details.id);
        creator.populateFromDetails(channelDetails);
        await creator.save();
        return creator.isPopular();
    }

    async upsertCreatorFromDetails(platform: string, details: MinimalCreatorDetails) {
        const creator = await upsertVideoCreator(platform, details);
        if (!ApiSupportedPlatforms.includes(platform)) {
            // nothing we can do about this
            return creator;
        }
        let channelDetails = await this.getChannelDetails(platform, details.id);
        creator.populateFromDetails(channelDetails);
        await creator.save();
        return creator;
    }

}
