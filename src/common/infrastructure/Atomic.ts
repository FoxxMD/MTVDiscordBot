import {MESSAGE} from 'triple-beam';
import {Logger} from '@foxxmd/winston';

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

export type Platform = 'youtube' | 'vimeo' | 'unknown';

export interface VideoDetails {
    duration: number,
    id: string
    platform: Platform
    url: string
    nsfw?: boolean
    title: string
    authorName: string
    authorId: string
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
