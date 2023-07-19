import {CacheType, ChatInputCommandInteraction} from "discord.js";
import {InteractionLike} from "../../common/infrastructure/Atomic.js";
import {Duration} from "dayjs/plugin/duration.js";
import {parseDurationValToDuration} from "../../utils/StringUtils.js";
import {interact} from "../../utils/index.js";

export interface DurationCommandParsingOptions {
    name?: string
    required?: boolean
    ephemeral?: boolean
    reply?: boolean
    currentInteraction?: InteractionLike
}

export const getDurationFromCommand = async (initialInteraction: ChatInputCommandInteraction<CacheType>, options?: DurationCommandParsingOptions): Promise<[InteractionLike, Duration?]> => {
    const {
        name = 'expires-at',
        required = false,
        ephemeral = true,
        reply = true,
        currentInteraction = initialInteraction
    } = options || {};

    const durationStr = initialInteraction.options.getString(name);

    if (durationStr === null || durationStr === undefined) {
        if(required) {
            await currentInteraction.reply({
                content: `The ${name} option is required but was not provided.`,
                ephemeral
            });
        }
        return [currentInteraction];
    }

    try {
        const dur = parseDurationValToDuration(durationStr);
        return [currentInteraction, dur];
    } catch (e) {
        if (reply) {
            await interact(currentInteraction, {
                content: `There was an error parsing time from ${name}:\n \`${e.message}\``,
                ephemeral
            });
        }
        return [currentInteraction];
    }

}
