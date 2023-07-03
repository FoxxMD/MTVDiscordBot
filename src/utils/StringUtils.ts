import {Duration} from "dayjs/plugin/duration.js";
import {RegExResult} from "../common/infrastructure/Atomic.js";
import {SimpleError} from "./Errors.js";
import dayjs from "dayjs";

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

/**
 * @see https://stackoverflow.com/a/61033353/1469797
 */
const REGEX_YOUTUBE: RegExp = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[^&\s\?]+(?!\S))\/)|(?:\S*v=|v\/)))([^&\s\?]+)/g;
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

const REGEX_TIME_FULL: RegExp = /(?<hours>[0-2][0-9]?):(?<minutes>[0-5][0-9]?):(?<seconds>[0-5][0-9]?)/;
const REGEX_TIME_MINUTES: RegExp = /(?<minutes>[0-5][0-9]?):(?<seconds>[0-5][0-9]?)/;
const REGEX_TIME_SECONDS: RegExp = /(?<seconds>[0-5][0-9]?)/;

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