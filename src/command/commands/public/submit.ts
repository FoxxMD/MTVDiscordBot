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
import {getOrInsertUser, getVideoByVideoId} from "../../../bot/functions/repository.js";
import {Logger} from "@foxxmd/winston";
import {Bot} from "../../../bot/Bot.js";
import {VideoManager} from "../../../common/video/VideoManager.js";
import {timestampToDuration} from "../../../utils/StringUtils.js";
import {rateLimitUser} from "../../../bot/functions/rateLimit.js";
import dayjs from "dayjs";
import {addFirehoseVideo} from "../../../bot/functions/addFirehoseVideo.js";
import {MinimalVideoDetails} from "../../../common/infrastructure/Atomic.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Submit a video to MTV')
        .addStringOption(option => option.setName('videourl')
            .setDescription('URL of the Video')
            .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction<CacheType>, logger: Logger, bot: Bot) {

        const user = await getOrInsertUser(interaction.member, bot.db);

        //await rateLimitUser(interaction, user);
        if(interaction.replied) {
            return;
        }

        const url = interaction.options.getString('videourl');

        const manager = new VideoManager(bot.config.credentials, bot.logger);

        const deets = await manager.getVideoDetails(url);

       const existingVideo = await getVideoByVideoId(deets.id, deets.platform);
        if (existingVideo !== undefined) {
            const isValidToSubmit = await existingVideo.validForSubmission();
            if (!isValidToSubmit) {
                const lastSubmission = await existingVideo.getLastSubmission();
                return await interaction.reply({
                    content: [
                        `This video was last submitted ${time(lastSubmission.createdAt)} (${time(lastSubmission.createdAt, 'R')}) here ${lastSubmission.getDiscordMessageLink()}`,
                        `At least one month must pass between submissions of the same video.`
                    ].join(' '),
                    ephemeral: true
                });
            }
        }

        if (deets.duration !== undefined && deets.title !== undefined) {
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
                await addFirehoseVideo(modalRes, deets as MinimalVideoDetails, user);
            } catch (e) {
                throw e;
            }
        }
    }
}
