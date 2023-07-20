import {
    CacheType,
    ChatInputCommandInteraction,
    ModalBuilder,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder,
    time, PermissionFlagsBits, GuildMember, userMention
} from "discord.js";
import {oneLine} from 'common-tags';
import {getOrInsertUser, getVideoByVideoId} from "../../../bot/functions/repository.js";
import {Logger} from "@foxxmd/winston";
import {Bot} from "../../../bot/Bot.js";
import {PlatformManager} from "../../../common/contentPlatforms/PlatformManager.js";
import {markdownTag, timestampToDuration} from "../../../utils/StringUtils.js";
import {addFirehoseVideo} from "../../../bot/functions/firehose.js";
import {
    AllowedVideoProviders,
    MinimalVideoDetails
} from "../../../common/infrastructure/Atomic.js";
import {
    checkLengthConstraints
} from "../../../bot/functions/userSubmissionFuncs.js";
import {videoDetailsToUrl} from "../../../common/contentPlatforms/UrlParser.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit-for')
        .setDescription('Submit a video to MTV on behalf of a User')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('Discord user to submit on behalf of')
                .setRequired(true))
        .addStringOption(option => option.setName('url')
            .setDescription('URL of the Video')
            .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction<CacheType>, logger: Logger, bot: Bot) {

        const behalfOf = interaction.options.getMember('user') as GuildMember;
        if(interaction.member.user.id === behalfOf.user.id) {
            return await interaction.reply({content: 'Cannot submit a video on your own behalf', ephemeral: true});
        }

        const user = await getOrInsertUser(behalfOf, interaction.guild);

        const url = interaction.options.getString('url');

        const manager = new PlatformManager(bot.config.credentials, bot.logger);

        const [deets, urlDetails, existingVideo] = await manager.getVideoDetails(url);
        const sanitizedUrl = urlDetails !== undefined ? videoDetailsToUrl(urlDetails) : url;

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

        if (deets.duration !== undefined && deets.title !== undefined) {
            await checkLengthConstraints(deets.duration, interaction, user);
            if (interaction.replied) {
                return;
            }
            await addFirehoseVideo(interaction, sanitizedUrl, deets as MinimalVideoDetails, user);
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
                logger.info(`Submitted ${url} for User ${userMention(user.discordId)}`, {sendToGuild: true, byDiscordUser: interaction.member.user.id})
                await addFirehoseVideo(modalRes, sanitizedUrl, deets as MinimalVideoDetails, user);
            } catch (e) {
                throw e;
            }
        }
    }
}
