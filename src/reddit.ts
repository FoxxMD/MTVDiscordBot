import {RedditCredentials} from "./common/infrastructure/OperatorConfig.js";
import Snoowrap from "snoowrap";
import {ErrorWithCause} from "pony-cause";

export class RedditClient {
    protected credentials: RedditCredentials;
    public client: Snoowrap;

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
        } catch (e) {
            throw new ErrorWithCause('Error occurred while testing reddit auth/communication', {cause: e});
        }
    }
}

