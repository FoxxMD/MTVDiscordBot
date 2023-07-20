import {MESSAGE} from 'triple-beam';
import {
    CacheType,
    ChatInputCommandInteraction, Guild as DiscordGuild,
    InteractionResponse, Message,
    MessageComponentInteraction,
    ModalSubmitInteraction
} from "discord.js";
import {Guild} from "../db/models/Guild.js";

export type LogLevel = "error" | "warn" | "safety" | "info" | "verbose" | "debug";
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
    discordGuild?: string | DiscordGuild
    guild?: string | Guild
    sendToGuild?: boolean
    byDiscordUser?: string
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

export type InteractionLike = ChatInputCommandInteraction<CacheType> | ModalSubmitInteraction<CacheType> | MessageComponentInteraction<CacheType>;

export type MessageLike = Message<true> | InteractionLike;

export type SpecialRoleType = 'approved' | 'janitor' | 'tos' | 'contentCreator';

export type AllowDenyType = 'allow' | 'deny';

export const AllowDenyTypes = {
    ALLOW: 'allow' as AllowDenyType,
    DENY: 'deny' as AllowDenyType
}

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

/**
 * A shorthand value for a DayJS duration consisting of a number value and time unit
 *
 * * EX `9 days`
 * * EX `3 months`
 * @pattern ^\s*(?<time>\d+)\s*(?<unit>days?|weeks?|months?|years?|hours?|minutes?|seconds?|milliseconds?)\s*$
 * */
export type DayJSShorthand = string;
/**
 * An ISO 8601 Duration
 * @pattern ^(-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$
 * */
export type ISO8601 = string;
export type DurationString = DayJSShorthand | ISO8601;

export interface PopularityThresholdLevel {
    count: number
    level: number
}
