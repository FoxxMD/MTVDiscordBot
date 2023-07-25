import {Duration} from "dayjs/plugin/duration.js";
import {DurationString, NamedGroup, numberFormatOptions, RegExResult} from "../common/infrastructure/Atomic.js";
import {SimpleError} from "./Errors.js";
import dayjs from "dayjs";
import {
    replaceResultTransformer,
    stripIndentTransformer,
    TemplateTag,
    TemplateTransformer,
    trimResultTransformer
} from 'common-tags'
import normalizeUrl from "normalize-url";
import {
    REGEX_TIME_FULL,
    REGEX_TIME_MINUTES,
    REGEX_TIME_SECONDS,
    REGEX_YOUTUBE
} from "../common/infrastructure/Regex.js";
import InvalidRegexError from "./InvalidRegexError.js";
import * as linkify from 'linkifyjs';

export const parseRegex = (reg: RegExp, val: string): RegExResult[] | undefined => {

    if (reg.global) {
        const g = Array.from(val.matchAll(reg));
        if (g.length === 0) {
            return undefined;
        }
        return g.map(x => {
            return {
                match: x[0],
                index: x.index,
                groups: x.slice(1),
                named: x.groups || {},
            } as RegExResult;
        });
    }

    const m = val.match(reg)
    if (m === null) {
        return undefined;
    }
    return [{
        match: m[0],
        index: m.index as number,
        groups: m.slice(1),
        named: m.groups || {}
    }];
}

export const parseRegexSingleOrFail = (reg: RegExp, val: string): RegExResult | undefined => {
    const results = parseRegex(reg, val);
    if (results !== undefined) {
        if (results.length > 1) {
            throw new SimpleError(`Expected Regex to match once but got ${results.length} results. Either Regex must NOT be global (using 'g' flag) or parsed value must only match regex once. Given: ${val} || Regex: ${reg.toString()}`);
        }
        return results[0];
    }
    return undefined;
}

export const parseUsableLinkIdentifier = (regexes: RegExp[] = [REGEX_YOUTUBE]) => (val?: string): (string | undefined) => {
    if (val === undefined) {
        return val;
    }
    for (const reg of regexes) {
        const matches = [...val.matchAll(reg)];
        if (matches.length > 0) {
            // use first capture group
            // TODO make this configurable at some point?
            const captureGroup = matches[0][matches[0].length - 1];
            if (captureGroup !== '') {
                return captureGroup;
            }
        }
    }
    return val;
}

export const timestampToDuration = (str: string): Duration => {
    const full = parseRegexSingleOrFail(REGEX_TIME_FULL, str);
    if (full !== undefined) {
        return dayjs.duration({
            hours: Number.parseInt(full.named.hours),
            minutes: Number.parseInt(full.named.minutes),
            seconds: Number.parseInt(full.named.seconds)
        })
    }
    const min = parseRegexSingleOrFail(REGEX_TIME_MINUTES, str);
    if (min !== undefined) {
        return dayjs.duration({
            minutes: Number.parseInt(min.named.minutes),
            seconds: Number.parseInt(min.named.seconds)
        })
    }
    const sec = parseRegexSingleOrFail(REGEX_TIME_SECONDS, str);
    if (sec !== undefined) {
        return dayjs.duration({
            seconds: Number.parseInt(sec.named.seconds)
        })
    }

    throw new SimpleError(`Timestamp '${str}' did not match format HH:MM:SS`);
}

export const durationToNormalizedTime = (dur: Duration): { hours: number, minutes: number, seconds: number } => {
    const totalSeconds = dur.asSeconds();

    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds - (hours * 3600)) / 60);
    const seconds = totalSeconds - (hours * 3600) - (minutes * 60);

    return {
        hours,
        minutes,
        seconds
    };
}

export const durationToTimestamp = (dur: Duration): string => {
    const nTime = durationToNormalizedTime(dur);

    const parts: string[] = [];
    if (nTime.hours !== 0) {
        parts.push(nTime.hours.toString().padStart(2, "0"));
    }
    parts.push(nTime.minutes.toString().padStart(2, "0"));
    parts.push(nTime.seconds.toString().padStart(2, "0"));
    return parts.join(':');
}

export const durationToHuman = (dur: Duration): string => {
    const nTime = durationToNormalizedTime(dur);

    const parts: string[] = [];
    if (nTime.hours !== 0) {
        parts.push(`${nTime.hours}hr`);
    }
    parts.push(`${nTime.minutes}min`);
    parts.push(`${nTime.seconds}sec`);
    return parts.join(' ');
}

const markdownListTransformer: TemplateTransformer = {
    onSubstitution(substitution, resultSoFar, context) {
        if (Array.isArray(substitution)) {
            return substitution.map(x => `* ${x}`).join('\n');
        }
        return substitution;
    }
}

export const markdownTag = new TemplateTag(
    markdownListTransformer,
    stripIndentTransformer('all'),
    trimResultTransformer()
);

// https://github.com/zspecza/common-tags/issues/176#issuecomment-1650242734
export const doubleReturnNewline = new TemplateTag(
    stripIndentTransformer('all'),
    // remove instances of single line breaks
    replaceResultTransformer(/(?<=.)\n(?!\n+)/g, ''),
    // replace instances of two or more line breaks with one line break
    replaceResultTransformer(/(?<=.)\n{2,}/g, '\n'),
    trimResultTransformer(),
);

export const formatNumber = (val: number | string, options?: numberFormatOptions) => {
    const {
        toFixed = 2,
        defaultVal = null,
        prefix = '',
        suffix = '',
        round,
    } = options || {};
    let parsedVal = typeof val === 'number' ? val : Number.parseFloat(val);
    if (Number.isNaN(parsedVal)) {
        return defaultVal;
    }
    if(!Number.isFinite(val)) {
        return 'Infinite';
    }
    let prefixStr = prefix;
    const {enable = false, indicate = true, type = 'round'} = round || {};
    if (enable && !Number.isInteger(parsedVal)) {
        switch (type) {
            case 'round':
                parsedVal = Math.round(parsedVal);
                break;
            case 'ceil':
                parsedVal = Math.ceil(parsedVal);
                break;
            case 'floor':
                parsedVal = Math.floor(parsedVal);
        }
        if (indicate) {
            prefixStr = `~${prefix}`;
        }
    }
    const localeString = parsedVal.toLocaleString(undefined, {
        minimumFractionDigits: toFixed,
        maximumFractionDigits: toFixed,
    });
    return `${prefixStr}${localeString}${suffix}`;
};

export const truncateStringToLength = (length: any, truncStr = '...') => (val: any = '') =>  {
    if(val === null) {
        return '';
    }
    const str = typeof val !== 'string' ? val.toString() : val;
    return str.length > length ? `${str.slice(0, length)}${truncStr}` : str;
}

export const parseUrl = (url: string) => {
    const normalized = normalizeUrl(url, {removeTrailingSlash: true, normalizeProtocol: true, forceHttps: true});
    return new URL(normalized);
}

export const parseDurationValToDuration = (val: DurationString): Duration => {
    let duration: Duration;
    if (typeof val === 'object') {
        duration = dayjs.duration(val);
        if (!dayjs.isDuration(duration)) {
            throw new Error('value given was not a well-formed Duration object');
        }
    } else {
        try {
            duration = parseDuration(val);
        } catch (e) {
            if (e instanceof InvalidRegexError) {
                throw new Error(`duration value of '${val}' could not be parsed as a valid ISO8601 duration or DayJS duration shorthand`);
            }
            throw e;
        }
    }
    return duration;
}

// string must only contain ISO8601 optionally wrapped by whitespace
const ISO8601_REGEX: RegExp = /^\s*((-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?)\s*$/;
// finds ISO8601 in any part of a string
const ISO8601_SUBSTRING_REGEX: RegExp = /((-?)P(?=\d|T\d)(?:(\d+)Y)?(?:(\d+)M)?(?:(\d+)([DW]))?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?)/g;
// string must only duration optionally wrapped by whitespace
const DURATION_REGEX: RegExp = /^\s*(?<time>\d+)\s*(?<unit>days?|weeks?|months?|years?|hours?|minutes?|seconds?|milliseconds?)\s*$/;
// finds duration in any part of the string
const DURATION_SUBSTRING_REGEX: RegExp = /(?<time>\d+)\s*(?<unit>days?|weeks?|months?|years?|hours?|minutes?|seconds?|milliseconds?)/g;

export const parseDurationFromString = (val: string, strict = true): {duration: Duration, original: string}[] => {
    let matches = parseRegex(strict ? DURATION_REGEX : DURATION_SUBSTRING_REGEX, val);
    if (matches !== undefined) {
        return matches.map(x => {
            const groups = x.named as NamedGroup;
            const dur: Duration = dayjs.duration(groups.time, groups.unit);
            if (!dayjs.isDuration(dur)) {
                throw new SimpleError(`Parsed value '${x.match}' did not result in a valid Dayjs Duration`);
            }
            return {duration: dur, original: `${groups.time} ${groups.unit}`};
        });
    }

    matches = parseRegex(strict ? ISO8601_REGEX : ISO8601_SUBSTRING_REGEX, val);
    if (matches !== undefined) {
        return matches.map(x => {
            const dur: Duration = dayjs.duration(x.groups[0]);
            if (!dayjs.isDuration(dur)) {
                throw new SimpleError(`Parsed value '${x.groups[0]}' did not result in a valid Dayjs Duration`);
            }
            return {duration: dur, original: x.groups[0]};
        });
    }

    throw new InvalidRegexError([(strict ? DURATION_REGEX : DURATION_SUBSTRING_REGEX), (strict ? ISO8601_REGEX : ISO8601_SUBSTRING_REGEX)], val)
}

export const parseDuration = (val: string, strict = true): Duration => {
    const res = parseDurationFromString(val, strict);
    if(res.length > 1) {
        throw new SimpleError(`Must only have one Duration value, found ${res.length} in: ${val}`);
    }
    return res[0].duration;
}

const ERROR_STACK_REGEX = /\w*Error.*\n\s*at(?:.|\n)*/i;
export const detectErrorStack = (str: string) => {
    return parseRegexSingleOrFail(ERROR_STACK_REGEX, str);
}

export const getUrlsFromString = (str: string) => {
    return linkify.find(str).filter(x => x.isLink && x.type === 'url').map(x => x.href);
}

export const buildDiscordMessageLink = (guildId: string, channelId: string, messageId: string) => {
    return `https://discord.com/channels/${guildId}/${channelId}/${messageId}`
}
