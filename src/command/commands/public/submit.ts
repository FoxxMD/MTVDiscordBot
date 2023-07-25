import {
    CacheType,
    ChatInputCommandInteraction,
    ModalBuilder,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    time, userMention
} from "discord.js";
import {oneLine} from 'common-tags';
import {getOrInsertUser, getVideoByVideoId} from "../../../bot/functions/repository.js";
import {Logger} from "@foxxmd/winston";
import {Bot} from "../../../bot/Bot.js";
import {PlatformManager} from "../../../common/contentPlatforms/PlatformManager.js";
import {markdownTag, timestampToDuration} from "../../../utils/StringUtils.js";
import dayjs from "dayjs";
import {addFirehoseVideo} from "../../../bot/functions/firehose.js";
import {
    AllowedVideoProviders, InteractionLike,
    MinimalCreatorDetails,
    MinimalVideoDetails
} from "../../../common/infrastructure/Atomic.js";
import {
    replyAge, replyBlacklisted, checkCreatorBlacklisted,
    checkLengthConstraints, checkRules,
    checkSelfPromotion, confirmTimestamp,
    rateLimitUser
} from "../../../bot/functions/userSubmissionFuncs.js";
import {GuildSettings} from "../../../common/db/models/GuildSettings.js";
import {memberHasRoleType} from "../../../bot/functions/userUtil.js";
import {ROLE_TYPES} from "../../../common/db/models/SpecialRole.js";
import {videoDetailsToUrl} from "../../../common/contentPlatforms/UrlParser.js";
import {MTVLogger} from "../../../common/logging.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Submit a video to MTV')
        .addStringOption(option => option.setName('url')
            .setDescription('URL of the Video')
            .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction<CacheType>, logger: MTVLogger, bot: Bot) {

        const user = await getOrInsertUser(interaction.member, interaction.guild);
        const hasAllowedRole = await memberHasRoleType(ROLE_TYPES.APPROVED, interaction);

        const url = interaction.options.getString('url');
        const manager = new PlatformManager(bot.config.credentials, bot.logger);

        let blacklisted = false,
            ruleFail = false,
            ageFail = false;

        await replyBlacklisted(interaction, user);
        if(interaction.replied) {
            blacklisted = true;
        }
        if(!blacklisted) {
            await checkRules(interaction, user);
        }
        if (interaction.replied) {
            ruleFail = true;
        }
        if(!ruleFail) {
            await replyAge(interaction, user);
        }
        if (interaction.replied) {
            ageFail = true;
        }

        if(!hasAllowedRole && (blacklisted || ruleFail || ageFail)) {
            let userReason = 'is blacklisted';
            if(ruleFail) {
                userReason = 'failed to agree to TOS';
            } else if(ageFail) {
                userReason = 'joined server less than 24 hours ago';
            }
            const [deets, urlDetails, existingVideo, creator] = await manager.getVideoDetails(url, true);
            if(creator !== undefined && creator.popular !== undefined) {
                if(creator.popular === 0) {
                    // submission is from unestablished creator AND user did not read rules, is too young, or is already blacklisted
                    // likely they are spamming and the creator is a spammy channel! straight to jail
                    const expiresAt = dayjs().add(1, 'week').toDate();
                    await creator.createModifier({flag: 'deny', reason: `${user.name} ${userReason} (spammy) and tried to submit video from this unknown creator.`, expiresAt});
                    logger['safety'](`Blacklisted Creator ${creator.humanId} for ${time(expiresAt, 'R')} due to spammy behavior from user: ${userMention(interaction.member.user.id)} ${userReason} and tried to submit video from this unknown creator.`, {sendToGuild: true});
                } else if(creator.popular < 3) {
                    logger['safety'](`${userMention(interaction.member.user.id)} ${userReason} and tried to submit video from this relatively unknown creator: ${creator.humanId}.`, {sendToGuild: true});
                }
            }
            return;
        }

        const guild = await user.getGuild();
        const limited = await guild.getSettingValue<boolean>(GuildSettings.RATE_LIMIT_MODE);

        if (limited) {
            await rateLimitUser(interaction, user);
            if (interaction.replied) {
                return;
            }
        }

        const [deets, urlDetails, existingVideo] = await manager.getVideoDetails(url);
        let sanitizedUrl = urlDetails !== undefined ? videoDetailsToUrl(urlDetails) : url;

        if(!AllowedVideoProviders.includes(deets.platform)) {
            return await interaction.reply(
                {
                    content: markdownTag`
                    The video platform for this link is either not recognized or not supported at this time. Supported platforms:
                    ${AllowedVideoProviders}
                    
                    If you believe this domain should be allowed please open a ticket in #support`,
                    ephemeral: true
                }
            )
        }

        if (existingVideo !== undefined) {
            const isValidToSubmit = await existingVideo.validForSubmission();
            if (!isValidToSubmit) {
                const mostRecentPost = await existingVideo.getMostRecentPost();
                return await interaction.reply({
                    content: oneLine`
                    This video was last seen ${time(mostRecentPost.createdAt)} (${time(mostRecentPost.createdAt, 'R')}) 
                    here ${mostRecentPost.getDiscordMessageLink()}.
                    At least one month must pass between submissions of the same video.`,
                    ephemeral: true
                });
            }
        }

        // can ignore self-promo if user is allowed
        if (!hasAllowedRole && deets.creator?.id !== undefined) {
            // now check creator popularity (gated by allow role check to reduce platform api calls)
            const creator = await manager.upsertCreatorFromDetails(deets.platform, deets.creator as MinimalCreatorDetails);
            await checkCreatorBlacklisted(interaction, creator);
            if(interaction.replied) {
                return;
            }
            if (!creator.isPopular()) {
                // either cannot get popularity from platform (api unsupported) or creator is not popular
                // so check for self-promo
                await checkSelfPromotion(interaction, deets.platform, deets.creator as MinimalCreatorDetails, user);
                if (interaction.replied) {
                    return;
                }
            }
        }

        if (deets.duration !== undefined && deets.title !== undefined) {
            await checkLengthConstraints(deets.duration, interaction, user);
            if (interaction.replied) {
                return;
            }
            let interact: InteractionLike = interaction;
            if(urlDetails !== undefined && urlDetails.params?.start !== undefined) {
                const [timestampRes, confirmation] = await confirmTimestamp(interaction, urlDetails.params?.start as number);
                if(timestampRes === false) {
                    return;
                }
                if(timestampRes === 'remove') {
                    sanitizedUrl = videoDetailsToUrl(urlDetails, {timestamp: false});
                }
                interact = confirmation;
            }
            await addFirehoseVideo(interact,  sanitizedUrl,deets as MinimalVideoDetails, user);
        } else {

            const titleComp = new TextInputBuilder()
                .setCustomId('title')
                .setLabel('Title')
                .setValue(deets.title ?? '')
                .setStyle(TextInputStyle.Short)
                .setRequired(deets.title === undefined);
            const durationComp = new TextInputBuilder()
                .setCustomId('duration')
                .setLabel('Duration in format HH:MM:SS')
                .setStyle(TextInputStyle.Short)
                .setRequired(deets.duration === undefined);

            const modal = new ModalBuilder()
                .setCustomId('myModal')
                .setTitle('Fill in missing details');

            const firstActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(titleComp);
            const secondActionRow = new ActionRowBuilder<TextInputBuilder>().addComponents(durationComp);

            modal.addComponents(firstActionRow, secondActionRow)

            await interaction.showModal(modal);
            try {
                const modalRes = await interaction.awaitModalSubmit({time: 30000});
                deets.title = modalRes.fields.getTextInputValue('title');

                const durationStr = modalRes.fields.getTextInputValue('duration');
                if (durationStr.trim() !== '') {
                    try {
                        const parsedDur = timestampToDuration(durationStr);
                        deets.duration = parsedDur.asSeconds();
                    } catch (e) {
                        await modalRes.reply({
                            content: 'Could not parse timestamp! Please resubmit with a timestamp matching the pattern HH:MM:SS',
                            ephemeral: true
                        });
                    }
                }
                await checkLengthConstraints(deets.duration, modalRes, user);
                if (interaction.replied) {
                    return;
                }
                await addFirehoseVideo(modalRes, sanitizedUrl,deets as MinimalVideoDetails, user);
            } catch (e) {
                throw e;
            }
        }
    }
}
