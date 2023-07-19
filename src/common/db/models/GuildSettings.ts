export const GuildSettings = {
    SUBMISSION_CHANNEL: 'submissionChannel',
    SAFETY_CHANNEL: 'safetyChannel',
    ERROR_CHANNEL: 'errorChannel',
    LOGGING_CHANNEL: 'loggingChannel',
    MIN_SECONDS: 'minimumSeconds',
    MAX_SECONDS: 'maxSeconds',
    RATE_LIMIT_MODE: 'rateLimitingMode',
    CATEGORY_SHOWCASE: 'categoryShowcase',
    CATEGORY_OC: 'categoryOc',
};

export const GuildSettingDefaults = {
    SUBMISSION_CHANNEL: 'firehose',
    SAFETY_CHANNEL: 'safety-logs',
    ERROR_CHANNEL: 'mtv-bot',
    LOGGING_CHANNEL: 'server-logs',
    MIN_SECONDS: 300,
    MAX_SECONDS: 3600,
    RATE_LIMIT_MODE: true
}
