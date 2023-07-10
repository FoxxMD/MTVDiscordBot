import {RedditCredentials} from "./common/infrastructure/OperatorConfig.js";
import Snoowrap, {Subreddit} from "snoowrap";
import {ErrorWithCause} from "pony-cause";
import {Video} from "./common/db/models/video.js";
import {MinimalVideoDetails} from "./common/infrastructure/Atomic.js";
import {Dayjs} from "dayjs";

export class RedditClient {
    protected credentials: RedditCredentials;
    public client: Snoowrap;
    public subreddit: Subreddit;
    public ready: boolean = false;

    constructor(credentials: RedditCredentials) {
        this.credentials = credentials;
    }

    async init() {
        try {
            this.client = new Snoowrap({
                clientId: this.credentials.clientId,
                clientSecret: this.credentials.clientSecret,
                refreshToken: this.credentials.refreshToken,
                accessToken: this.credentials.accessToken,
                userAgent: 'script:mtvBot:dev'
            });
        } catch (e) {
            throw new ErrorWithCause('Could not instantiate Snoowrap client', {cause: e});
        }

        try {
            // @ts-ignore
            await this.client.getMe();
            // @ts-ignore
            this.subreddit = await this.client.getSubreddit('mealtimevideos');
            this.ready = true;
        } catch (e) {
            throw new ErrorWithCause('Error occurred while testing reddit auth/communication', {cause: e});
        }
    }

    async getHot() {
        return await this.subreddit.getHot({limit: 20});
    }
}

export interface RedditVideo {
    video: Video
    user: string
    url: string
    submittedAt: Dayjs
}

export interface RedditVideoDetails {
    video: MinimalVideoDetails
    user: string
    url: string
    submittedAt: Dayjs
}
