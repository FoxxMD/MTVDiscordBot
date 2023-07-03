import {User} from "../../common/db/models/user.js";
import {CacheType, ChatInputCommandInteraction, time} from "discord.js";
import {getUserLastSubmittedVideo} from "./repository.js";
import dayjs from "dayjs";
import {InteractionLike} from "../../common/infrastructure/Atomic.js";
import {GuildSettings} from "../../common/db/models/GuildSettings.js";
import {durationToHuman} from "../../utils/StringUtils.js";

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

export const checkLengthConstraints = async (length: number, interaction: InteractionLike, user: User)=> {
    const guild = await user.getGuild();
    const min = await guild.getSettingValue<number>(GuildSettings.MIN_SECONDS);
    const max = await guild.getSettingValue<number>(GuildSettings.MAX_SECONDS);

    if(length < min) {
        await interaction.reply({content: `Submissions must be a minimum length of **${durationToHuman(dayjs.duration({seconds: min}))}** but your submission is **${durationToHuman(dayjs.duration({seconds: length}))}**`, ephemeral: true});
    } else if (length > max) {
        await interaction.reply({content: `Submissions must be a maximum length of **${durationToHuman(dayjs.duration({seconds: max}))}** but your submission is **${durationToHuman(dayjs.duration({seconds: length}))}**`, ephemeral: true});
    }
}
