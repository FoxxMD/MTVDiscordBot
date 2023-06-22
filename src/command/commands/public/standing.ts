import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder} from "discord.js";
import {Sequelize} from "sequelize";
import {getOrInsertUser} from "../../../bot/functions/repository.js";
import {buildStandingProfile} from "../../../bot/functions/userUtil.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('standing')
        .setDescription('Get your Standing within MTV'),
    async execute(interaction:  ChatInputCommandInteraction<CacheType>, db: Sequelize) {
        const user = await getOrInsertUser(interaction.member, db);
        const standing = await buildStandingProfile(user);
        await interaction.reply({embeds: [standing], ephemeral: true});
    }
}
