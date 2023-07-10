export const REGEX_VOTING_ACTIVE: RegExp = /Voting Active: \*\*(?<status>\w+)\*\*(?<until> \(.+\))/;
/**
 * @see https://stackoverflow.com/a/61033353/1469797
 */
export const REGEX_YOUTUBE: RegExp = /(?:https?:\/\/)?(?:www\.)?youtu(?:\.be\/|be.com\/\S*(?:watch|embed)(?:(?:(?=\/[^&\s\?]+(?!\S))\/)|(?:\S*v=|v\/)))([^&\s\?]+)/g;
export const REGEX_TIME_FULL: RegExp = /(?<hours>[0-2][0-9]?):(?<minutes>[0-5][0-9]?):(?<seconds>[0-5][0-9]?)/;
export const REGEX_TIME_MINUTES: RegExp = /(?<minutes>[0-5][0-9]?):(?<seconds>[0-5][0-9]?)/;
export const REGEX_TIME_SECONDS: RegExp = /(?<seconds>[0-5][0-9]?)/;
