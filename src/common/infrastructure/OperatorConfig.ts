import YamlConfigDocument from "../config/YamlConfigDocument.js";
import {LoggingOptions} from "./Logging.js";

export class YamlOperatorConfigDocument extends YamlConfigDocument<OperatorConfig> {

}

export interface OperatorFileConfig {
    document: YamlOperatorConfigDocument
    isWriteable?: boolean
}

export interface OperatorConfigWithFileContext extends OperatorConfig {
    fileConfig: OperatorFileConfig
}

export interface DiscordCredentials {
    token: string
    clientId: string
}

export interface VimeoCredentials {
    token: string
    clientId: string
    clientSecret
}

export interface RedditCredentials {
    clientId: string
    clientSecret: string
    accessToken: string
    refreshToken: string
}

export interface Credentials {
        youtube?: string
        discord?: DiscordCredentials
        vimeo?: VimeoCredentials
        reddit?: RedditCredentials
}

export interface StrongCredentials extends Credentials {
    discord: DiscordCredentials
}

export interface OperatorConfig extends OperatorJsonConfig {
    credentials: StrongCredentials
}

export interface OperatorJsonConfig {
    /**
     * Settings to configure global logging defaults
     * */
    logging?: LoggingOptions,
    credentials?: Credentials
}
