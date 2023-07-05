import {User} from "../../common/db/models/user.js";
import {CacheType, ChatInputCommandInteraction, time} from "discord.js";
import {oneLine} from 'common-tags';
import {getCreatorByDetails, getUserLastSubmittedVideo} from "./repository.js";
import dayjs from "dayjs";
import {
    InteractionLike,
    MinimalCreatorDetails,
    MinimalVideoDetails,
    VideoDetails
} from "../../common/infrastructure/Atomic.js";
import {GuildSettings} from "../../common/db/models/GuildSettings.js";
import {durationToHuman, formatNumber} from "../../utils/StringUtils.js";
import {VideoSubmission} from "../../common/db/models/videosubmission.js";
import {memberHasRoleType} from "./userUtil.js";
import {ROLE_TYPES} from "../../common/db/models/SpecialRole.js";

export const rateLimitUser = async (interaction: ChatInputCommandInteraction<CacheType>, user: User) => {
    const lastSubmitted = await getUserLastSubmittedVideo(user);
    if (lastSubmitted !== undefined) {
        const remaining = await user.rateLimitRemaining(lastSubmitted.createdAt);
        if (remaining > 0) {
            const level = await user.getSubmissionLevel();
            await interaction.reply({
                content: oneLine`
            Your current Trust Level (${level.id} - ${level.name}) allows submitting a video every ${dayjs.duration({seconds: level.timePeriod}).asHours()} hours.
            You last submitted a video on ${time(lastSubmitted.createdAt)} and can next submit a video ${time(dayjs().add(remaining, 'seconds').toDate(), 'R')}.
            `,
                ephemeral: true
            });
        }
    }
}

export const checkLengthConstraints = async (length: number, interaction: InteractionLike, user: User) => {
    const guild = await user.getGuild();
    const min = await guild.getSettingValue<number>(GuildSettings.MIN_SECONDS);
    const max = await guild.getSettingValue<number>(GuildSettings.MAX_SECONDS);

    if (length < min) {
        await interaction.reply({
            content: oneLine`
            Submissions must be a minimum length of **${durationToHuman(dayjs.duration({seconds: min}))}** 
            but your submission is **${durationToHuman(dayjs.duration({seconds: length}))}**
            `,
            ephemeral: true
        });
    } else if (length > max) {
        await interaction.reply({
            content: oneLine`Submissions must be a maximum length of **${durationToHuman(dayjs.duration({seconds: max}))}** 
            but your submission is **${durationToHuman(dayjs.duration({seconds: length}))}**
            `,
            ephemeral: true
        });
    }
}

export const checkSelfPromotion = async (interaction: InteractionLike, platform: string, details: MinimalCreatorDetails, user: User) => {
    const creator = await getCreatorByDetails(platform, details);
    const submissions = await VideoSubmission.findAll({where: {userId: user.id}, include: {all: true, nested: true}})
    if (submissions.length < 3) {
        // grace period when they have little history
        return;
    }
    const originSubmissions = submissions.filter(x => x.video.creator.platformId === details.id);
    if (originSubmissions.length === 0) {
        return;
    }
    const percent = (originSubmissions.length / submissions.length) * 100;
    if (percent > 20) {
        await interaction.reply({
            content: oneLine`
            ${formatNumber(percent, {toFixed: 0})}% of your submissions are from the creator ${creator.name}
            which is above the allowed limit of 20% and considered self-promotion. Please submit videos from a variety of sources.
            `,
            ephemeral: true
        });
    }
}

export const checkAge = async (interaction: InteractionLike, user: User) => {
    const hasAllowedRole = await memberHasRoleType(ROLE_TYPES.APPROVED, interaction);
    if(hasAllowedRole) {
        return;
    }
    const userCreated = dayjs(user.createdAt);
    const waitingPeriodOver = userCreated.add(24, 'hours');

    if(waitingPeriodOver.isAfter(dayjs())) {
        await interaction.reply({
            content: oneLine`
            In order to prevent spam new users must wait 24 hours after first interaction before they can submit videos.
            You may start submitting videos ${time(waitingPeriodOver.toDate(), 'R')}
            `,
            ephemeral: true
        });
    }
}

export const checkRules = async (interaction: InteractionLike, user: User) => {
    const ruleRoleExists = (await user.guild.getRoleIdsByType(ROLE_TYPES.TOS)).length > 0;
    if(!ruleRoleExists) {
        return;
    }

    const hasRuleReadRole = await memberHasRoleType(ROLE_TYPES.TOS, interaction);
    if(!hasRuleReadRole) {
        await interaction.reply({
            content: oneLine`
            You must **agree to the server rules** before you can submit a video.
            `,
            ephemeral: true
        });
    }
}
