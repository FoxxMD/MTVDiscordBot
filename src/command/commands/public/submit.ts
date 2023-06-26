import {
    CacheType,
    ChatInputCommandInteraction,
    ModalBuilder,
    SlashCommandBuilder,
    TextInputBuilder,
    TextInputStyle,
    ActionRowBuilder
} from "discord.js";
import {getOrInsertUser} from "../../../bot/functions/repository.js";
import {Logger} from "@foxxmd/winston";
import {Bot} from "../../../bot/Bot.js";
import {VideoManager} from "../../../common/video/VideoManager.js";
import {timestampToDuration} from "../../../utils/StringUtils.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('submit')
        .setDescription('Submit a video to MTV')
        .addStringOption(option => option.setName('videourl')
            .setDescription('URL of the Video')
            .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction<CacheType>, logger: Logger, bot: Bot) {

        // TODO check if user is rate limited
        const user = await getOrInsertUser(interaction.member, bot.db);

        const url = interaction.options.getString('videourl');

        const manager = new VideoManager(bot.config.credentials, bot.logger);

        const deets = await manager.getVideoDetails(url);

        // TODO check for existing video submission

        if (deets.duration !== undefined && deets.title !== undefined) {
            // TODO store video to db
            // TODO determine channel to post to
            // TODO post to channel
            await interaction.reply({content: `Video submitted! ${JSON.stringify(deets)}`, ephemeral: true});
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
                // TODO store video to db
                // TODO determine channel to post to
                // TODO post to channel
                await modalRes.reply({content: `Video submitted! ${JSON.stringify(deets)}`, ephemeral: true});
            } catch (e) {
                throw e;
            }
        }
    }
}
