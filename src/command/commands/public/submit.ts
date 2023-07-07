import {
    CacheType,
    ChatInputCommandInteraction,
    ModalBuilder,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    time
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
    AllowedVideoProviders,
    MinimalCreatorDetails,
    MinimalVideoDetails
} from "../../../common/infrastructure/Atomic.js";
import {
    checkAge,
    checkLengthConstraints, checkRules,
    checkSelfPromotion,
    rateLimitUser
} from "../../../bot/functions/userSubmissionFuncs.js";
import {GuildSettings} from "../../../common/db/models/GuildSettings.js";
import {memberHasRoleType} from "../../../bot/functions/userUtil.js";
import {ROLE_TYPES} from "../../../common/db/models/SpecialRole.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Submit a video to MTV')
        .addStringOption(option => option.setName('videourl')
            .setDescription('URL of the Video')
            .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction<CacheType>, logger: Logger, bot: Bot) {

        const user = await getOrInsertUser(interaction.member, interaction.guild);
        const hasAllowedRole = await memberHasRoleType(ROLE_TYPES.APPROVED, interaction);

        await checkRules(interaction, user);
        if (interaction.replied) {
            return;
        }
        await checkAge(interaction, user);
        if (interaction.replied) {
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

        const url = interaction.options.getString('videourl');

        const manager = new PlatformManager(bot.config.credentials, bot.logger);

        const deets = await manager.getVideoDetails(url);

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

        const existingVideo = await getVideoByVideoId(deets.id, deets.platform);
        if (existingVideo !== undefined) {
            const isValidToSubmit = await existingVideo.validForSubmission();
            if (!isValidToSubmit) {
                const lastSubmission = await existingVideo.getLastSubmission();
                return await interaction.reply({
                    content: oneLine`
                    This video was last submitted ${time(lastSubmission.createdAt)} (${time(lastSubmission.createdAt, 'R')}) 
                    here ${lastSubmission.getDiscordMessageLink()}.
                    At least one month must pass between submissions of the same video.`,
                    ephemeral: true
                });
            }
        }

        // can ignore self-promo if user is allowed
        if (!hasAllowedRole && deets.creator.id !== undefined) {
            // now check creator popularity (gated by allow role check to reduce platform api calls)
            const popular = manager.checkPopularity(deets.platform, deets.creator as MinimalCreatorDetails);
            if (!popular) {
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
            await addFirehoseVideo(interaction, deets as MinimalVideoDetails, user);
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
                await addFirehoseVideo(modalRes, deets as MinimalVideoDetails, user);
            } catch (e) {
                throw e;
            }
        }
    }
}
