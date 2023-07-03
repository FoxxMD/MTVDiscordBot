import {User} from "../../common/db/models/user.js";
import {CacheType, ChatInputCommandInteraction, time} from "discord.js";
import {getUserLastSubmittedVideo} from "./repository.js";
import dayjs from "dayjs";

export const rateLimitUser = async (interaction: ChatInputCommandInteraction<CacheType>, user: User) => {
    const lastSubmitted = await getUserLastSubmittedVideo(user);
    if(lastSubmitted !== undefined) {
        const remaining = await user.rateLimitRemaining(lastSubmitted.createdAt);
        if(remaining > 0) {
            const level = await user.getSubmissionLevel();
            const parts: string[] = [
                `Your current Trust Level (${level.id} - ${level.name}) allows submitting a video every ${dayjs.duration({seconds: level.timePeriod}).asHours()} hours.`,
                `You last submitted a video on ${time(lastSubmitted.createdAt)} and can next submit a video ${time(dayjs().add(remaining, 'seconds').toDate(), 'R')}.`
            ];
            await interaction.reply({
                content: parts.join(' '),
                ephemeral: true
            });
        }
    }
}
