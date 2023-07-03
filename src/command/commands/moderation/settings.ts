import {CacheType, ChatInputCommandInteraction, SlashCommandBuilder, PermissionFlagsBits} from "discord.js";
import {getOrInsertGuild} from "../../../bot/functions/repository.js";
import {Logger} from "@foxxmd/winston";
import {GuildSettings} from "../../../common/db/models/GuildSettings.js";
import {Bot} from "../../../bot/Bot.js";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('settings')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDescription('Display or set Settings for MTV Bot')
        .addSubcommand(subCommand =>
            subCommand.setName('firehose')
                .setDescription('Display or set Submission channel')
                .addChannelOption(option =>
                    option.setName('channel')
                        .setDescription('The channel to post to')
                        .setRequired(false))
        )
        .addSubcommand(subCommand =>
            subCommand.setName('videolength')
                .setDescription('Display or set min/max lengths allowed for videos')
                .addNumberOption(opt =>
                    opt.setName('min')
                        .setDescription('The minimum length (seconds) submitted videos must be')
                        .setRequired(false)
                        .setMinValue(1))
                .addNumberOption(opt =>
                    opt.setName('max')
                        .setDescription('The maximum length (seconds) submitted videos must be')
                        .setRequired(false)
                        .setMinValue(1))
        ),
    async execute(interaction: ChatInputCommandInteraction<CacheType>, logger: Logger, bot: Bot) {

        const guild = await getOrInsertGuild(interaction.guild, logger);

        switch(interaction.options.getSubcommand()) {
            case 'firehose':
                const channel = interaction.options.getChannel('channel');
                if(channel === undefined) {
                    const subChannel = await guild.getSettingValue<string>(GuildSettings.SUBMISSION_CHANNEL);
                    await interaction.reply({content: `Submission channel is #${subChannel}`, ephemeral: true});
                } else {
                    await guild.upsertSetting(GuildSettings.SUBMISSION_CHANNEL, channel.id);
                    await interaction.reply({content: `Set => Submission channel is #${channel.name}`, ephemeral: true});
                }
                break;
            case 'videolength':
                const min = interaction.options.getNumber('min');
                const max = interaction.options.getNumber('max');
                if(min === null && max === null) {
                    const minSetting = await guild.getSettingValue<number>(GuildSettings.MIN_SECONDS);
                    const maxSetting = await guild.getSettingValue<number>(GuildSettings.MAX_SECONDS)
                    await interaction.reply({content: `Min: ${minSetting}s | Max: ${maxSetting}s`, ephemeral: true});
                } else {
                    await guild.upsertSetting(GuildSettings.MIN_SECONDS, min, true);
                    await guild.upsertSetting(GuildSettings.MAX_SECONDS, max, true);
                    await interaction.reply({content: `Set => Min: ${min}s | Max: ${max}s`, ephemeral: true});
                }
                break;
            default:
                await interaction.reply({content: `Unrecognized command: ${interaction.options.getSubcommand()}`, ephemeral: true});
        }
    }
}
