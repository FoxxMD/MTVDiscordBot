import {CacheType, ChatInputCommandInteraction, GuildMember, SlashCommandBuilder} from "discord.js";
import {getOrInsertUser} from "../../../bot/functions/repository.js";
import {buildStandingProfile} from "../../../bot/functions/userUtil.js";
import {Logger} from "@foxxmd/winston";
import {Bot} from "../../../bot/Bot.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('standing')
        .setDescription('Get Standing of a user')
        .addUserOption(opt =>
            opt.setName('user')
                .setDescription('User to display standing for. Defaults to YOU')
                .setRequired(false)),
    async execute(interaction: ChatInputCommandInteraction<CacheType>, logger: Logger, bot: Bot) {
        const discordUser = interaction.options.getMember('user') as GuildMember | null;
        let requestedUser = discordUser === null || discordUser === undefined ? interaction.member : discordUser;
        const user = await getOrInsertUser(requestedUser,  interaction.guild);
        const standing = await buildStandingProfile(user);
        await interaction.reply({embeds: [standing], ephemeral: true});
    }
}
