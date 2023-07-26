import {User} from "../../common/db/models/user.js";
import {
    CacheType,
    ChatInputCommandInteraction,
    GuildMember,
    time,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    SlashCommandBuilder, MessageComponentInteraction,
} from "discord.js";
import {oneLine} from 'common-tags';
import {getCreatorByDetails, getUserLastSubmittedVideo} from "./repository.js";
import dayjs, {Dayjs} from "dayjs";
import {
    InteractionLike,
    MinimalCreatorDetails,
    MinimalVideoDetails,
    VideoDetails
} from "../../common/infrastructure/Atomic.js";
import {GuildSettings} from "../../common/db/models/GuildSettings.js";
import {durationToHuman, formatNumber} from "../../utils/StringUtils.js";
import {VideoSubmission} from "../../common/db/models/videosubmission.js";
import {checkAge, checkBlacklisted, memberHasRoleType} from "./userUtil.js";
import {ROLE_TYPES} from "../../common/db/models/SpecialRole.js";
import {MessageActionRowComponentBuilder} from "@discordjs/builders";
import {Creator} from "../../common/db/models/creator.js";
import {Video} from "../../common/db/models/video.js";
import {Bot} from "../Bot.js";
import {RateLimiterRes} from "rate-limiter-flexible";
import {SubmissionTrustLevel} from "../../common/db/models/SubmissionTrustLevel.js";

export const rateLimitUser = async (interaction: ChatInputCommandInteraction<CacheType>, user: User, bot: Bot): Promise<[RateLimiterRes, SubmissionTrustLevel, string?]> => {
    const lastSubmitted = await getUserLastSubmittedVideo(user);
    const level = await user.getSubmissionLevel();
    const limiter = await user.getSubmissionLimiter(bot);
    try {
        const res = await limiter.consume(user.id, 1);
        return [res, level];
    } catch(e: unknown) {
        if('msBeforeNext' in (e as object)) {
            let r = e as RateLimiterRes;
            const msg = oneLine`
            Your current Trust Level (${level.id} - ${level.name}) allows submitting ${level.allowedSubmissions} videos every ${dayjs.duration({seconds: level.timePeriod}).asHours()} hours.
            ${lastSubmitted !== undefined ? `You last submitted a video on ${time(lastSubmitted.createdAt)} and` : 'You'} can next submit a video ${time(dayjs().add(r.msBeforeNext, 'milliseconds').toDate(), 'R')}.
            `;
            return [r, level, msg];
        }
        throw e;
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

export const checkCreatorBlacklisted = async (interaction: InteractionLike, creator: Creator) => {
    const activeModifier = await creator.getActiveModifier();
    if(activeModifier === undefined || activeModifier.flag === 'allow') {
        return;
    }
    await interaction.reply({
        content: oneLine`
            The creator '${creator.name}' has been blacklisted and cannot be used for new submissions.
            The blacklist expires ${activeModifier.expiresAt !== undefined ? time(activeModifier.expiresAt, 'R') : 'never'}. 
            `,
        ephemeral: true
    });
}

export const checkSelfPromotion = async (interaction: InteractionLike, platform: string, details: MinimalCreatorDetails, user: User) => {
    const creator = await getCreatorByDetails(platform, details);
    const submissions = await VideoSubmission.findAll({where: {userId: user.id},
        include: {
            model: Video,
            as: 'video',
            include: [{
                model: Creator,
                as: 'creator'
            }]
        }
    });
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

export const replyBlacklisted = async (interaction: InteractionLike, user: User) => {
    const isBlacklisted = await checkBlacklisted(interaction, user);
    if(isBlacklisted) {
        const activeModifier = await user.getActiveModifier();
        await interaction.reply({
            content: oneLine`
            You are in jail and not allowed to make new submissions due to previous infractions.
            Your sentence ends ${activeModifier.expiresAt !== undefined ? time(activeModifier.expiresAt, 'R') : 'never'}. 
            `,
            ephemeral: true
        });
    }
}

export const replyAge = async (interaction: InteractionLike, user: User): Promise<[Dayjs?, string?]> => {
    const waitingPeriodOver = await checkAge(interaction, user);
    if(waitingPeriodOver !== undefined) {
        return [waitingPeriodOver, oneLine`
            In order to prevent spam new users must wait 24 hours after joining the server before they can submit videos.
            You may start submitting videos ${time(waitingPeriodOver.toDate(), 'R')}
            `];
    }
    return [];
}

export const checkRules = async (interaction: InteractionLike, user: User) => {
    let hasReadRules = true;
    if(interaction.member.pending) {
        return await interaction.reply({
            content: oneLine`
            You must **agree to the server rules** before you can submit a video.
            `,
            ephemeral: true
        });
    } else {
        const ruleRoles = await ((await user.getGuild()).getRoleIdsByType(ROLE_TYPES.TOS));
        const ruleRoleExists = ruleRoles.length > 0;
        if(ruleRoleExists) {
            const hasReadTOS = await memberHasRoleType(ROLE_TYPES.TOS, interaction);
            if(!hasReadTOS) {
                await interaction.reply({
                    content: oneLine`
            You must **read the getting started/video submission instructions** before you can submit a video.
            `,
                    ephemeral: true
                });
            }
        }
    }
}

export const confirmTimestamp = async (interaction: InteractionLike, timestamp: number): Promise<[boolean | 'remove', MessageComponentInteraction?]> => {
    const confirm = new ButtonBuilder()
        .setCustomId('confirm')
        .setLabel('Yes, keep timestamp')
        .setStyle(ButtonStyle.Primary);

    const confirmRemove = new ButtonBuilder()
        .setCustomId('remove')
        .setLabel('No, remove timestamp')
        .setStyle(ButtonStyle.Secondary);

    const cancel = new ButtonBuilder()
        .setCustomId('cancel')
        .setLabel(`No, I'll resubmit`)
        .setStyle(ButtonStyle.Secondary);

    const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
        .addComponents(confirm, confirmRemove, cancel);

    const dur = durationToHuman(dayjs.duration({seconds: timestamp}));

    const response = await interaction.reply({
        content: `Your URL contains a **timestamp** that will start this video at **${dur}**. Please confirm this is intentional.`,
        components: [row],
        ephemeral: true
    });

    const collectorFilter = i => i.user.id === interaction.user.id;

    try {
        const confirmation = await response.awaitMessageComponent({filter: collectorFilter, time: 30000});
        if (confirmation.customId === 'confirm') {
            return [true, confirmation];
        } else if (confirmation.customId === 'cancel') {
            await confirmation.update({content: 'Submit Cancelled', components: []});
            return [false];
        }
        return ['remove', confirmation];
    } catch (e) {
        await interaction.editReply({
            content: 'Confirmation not received within 30 seconds, cancelling',
            components: [],
        });
        return [false];
    }
}
