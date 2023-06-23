import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {Sequelize} from "sequelize";
import {getOrInsertGuild, getOrInsertUser} from "../../../bot/functions/repository.js";
import {buildStandingProfile} from "../../../bot/functions/userUtil.js";
import {Logger} from "@foxxmd/winston";
import {GuildSettings} from "../../../common/db/models/GuildSettings.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('setfirehose')
        .setDescription('Set the channel where posts made by /submit are posted to')
        .addChannelOption(option =>
            option.setName('channel')
                .setDescription('The channel to post to')
                .setRequired(true)),
    async execute(interaction: ChatInputCommandInteraction<CacheType>, db: Sequelize, logger: Logger) {
        const guild = await getOrInsertGuild(interaction.guild, db);
        const channel = interaction.options.getChannel('channel');
        await guild.upsertSetting(GuildSettings.SUBMISSION_CHANNEL, channel.id);
        await interaction.reply({content: `Using #${channel.name} as submission channel.`});
    }
}
