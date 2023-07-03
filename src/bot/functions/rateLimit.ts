import {User} from "../../common/db/models/user.js";
import {Sequelize} from "sequelize";
import {CacheType, ChatInputCommandInteraction} from "discord.js";
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
                `You last submitted a video on ${dayjs(lastSubmitted.createdAt).format('YYYY-MM-DD HH:mm:ssZ')} and have ${dayjs.duration({seconds: remaining}).humanize()} remaining before you can submit another.`
            ];
            await interaction.reply({
                content: parts.join(' ')
            });
        }
    }
}
