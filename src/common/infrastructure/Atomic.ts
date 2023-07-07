import {MESSAGE} from 'triple-beam';
import {CacheType, ChatInputCommandInteraction, ModalSubmitInteraction} from "discord.js";

export type LogLevel = "error" | "warn" | "info" | "verbose" | "debug";
export const logLevels = ['error', 'warn', 'info', 'verbose', 'debug'];

export type ConfigFormat = 'yaml';

export interface LogConfig {
    level?: string
    file?: string | false
    stream?: string
    console?: string
}

export interface LogOptions {
    /**
     *  Specify the minimum log level for all log outputs without their own level specified.
     *
     *  Defaults to env `LOG_LEVEL` or `info` if not specified.
     *
     *  @default 'info'
     * */
    level?: LogLevel
    /**
     * Specify the minimum log level to output to rotating files. If `false` no log files will be created.
     * */
    file?: LogLevel | false
    /**
     * Specify the minimum log level streamed to the UI
     * */
    stream?: LogLevel
    /**
     * Specify the minimum log level streamed to the console (or docker container)
     * */
    console?: LogLevel
}

export const asLogOptions = (obj: LogConfig = {}): obj is LogOptions => {
    return Object.entries(obj).every(([key,  val]) => {
        if(key !== 'file') {
            return val === undefined || logLevels.includes(val.toLocaleLowerCase());
        }
        return val === undefined || val === false || logLevels.includes(val.toLocaleLowerCase());
    });
}

export interface LogInfo {
    message: string
    [MESSAGE]: string,
    level: string
    timestamp: string
    labels?: string[]
    transport?: string[]
}

export const staffRoleKeywords = ['moderation', 'admin'];
export const approvedRoleKeywords = ['approved', 'trusted'];

export type Platform = 'youtube' | 'vimeo' | 'ted' | 'twitch' | 'facebook' | 'dailymotion' | 'unknown' | string;

export const ApiSupportedPlatforms: Platform[] = ['youtube', 'vimeo'];

export const AllowedVideoProviders: Platform[] = ['youtube', 'vimeo', 'ted', 'twitch', 'facebook', 'dailymotion'];

export interface CreatorDetails {
    id?: string
    name?: string
    followers?: number
    createdAt?: Date
}

export interface MinimalCreatorDetails extends CreatorDetails {
    id: string
}

export type FullCreatorDetails = Required<CreatorDetails>;

export interface VideoDetails {
    duration?: number,
    id: string
    platform: Platform
    url: URL
    nsfw?: boolean
    title?: string
    creator?: CreatorDetails
}

export interface MinimalVideoDetails extends VideoDetails {
    duration: number
    title: string
    creator: MinimalCreatorDetails
}

export interface NamedGroup {
    [name: string]: any
}

export interface RegExResult {
    match: string,
    groups: string[],
    index: number
    named: NamedGroup
}

export type InteractionLike = ChatInputCommandInteraction<CacheType> | ModalSubmitInteraction<CacheType>;

export type SpecialRoleType = 'approved' | 'janitor' | 'tos';

export interface numberFormatOptions {
    toFixed: number,
    defaultVal?: any,
    prefix?: string,
    suffix?: string,
    round?: {
        type?: string,
        enable: boolean,
        indicate?: boolean,
    }
}

export const VideoReactions = {
    UP: '👍',
    DOWN: '👎',
    REPORT: '❌'
};
