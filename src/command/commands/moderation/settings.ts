import {
    CacheType,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    ChannelType,
    CategoryChannel
} from "discord.js";
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
            subCommand.setName('video-length')
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
        )
        .addSubcommand(subCommand =>
            subCommand.setName('rate-limiting')
                .setDescription('Display or set submission rate limiting for users')
                .addBooleanOption(opt =>
                    opt.setName('limiting')
                        .setDescription('Set limiting mode')
                        .setRequired(false))
        )
        .addSubcommand(subCommand =>
            subCommand.setName('category-showcase')
                .setDescription('Display or set Showcase Channel Category')
                .addChannelOption(opt =>
                    opt.setName('name')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setDescription('Set category for non-oc videos')
                        .setRequired(false))
        )
        .addSubcommand(subCommand =>
            subCommand.setName('category-oc')
                .setDescription('Display or set OC Channel Category')
                .addChannelOption(opt =>
                    opt.setName('name')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setDescription('Set category for OC videos')
                        .setRequired(false))
        )
    ,
    async execute(interaction: ChatInputCommandInteraction<CacheType>, logger: Logger, bot: Bot) {

        const guild = await getOrInsertGuild(interaction.guild, logger);

        switch (interaction.options.getSubcommand()) {
            case 'firehose':
                const channel = interaction.options.getChannel('channel');
                if (channel === undefined) {
                    const subChannel = await guild.getSettingValue<string>(GuildSettings.SUBMISSION_CHANNEL);
                    await interaction.reply({content: `Submission channel is #${subChannel}`, ephemeral: true});
                } else {
                    await guild.upsertSetting(GuildSettings.SUBMISSION_CHANNEL, channel.id);
                    await interaction.reply({
                        content: `Set => Submission channel is #${channel.name}`,
                        ephemeral: true
                    });
                }
                break;
            case 'video-length':
                const min = interaction.options.getNumber('min');
                const max = interaction.options.getNumber('max');
                if (min === null && max === null) {
                    const minSetting = await guild.getSettingValue<number>(GuildSettings.MIN_SECONDS);
                    const maxSetting = await guild.getSettingValue<number>(GuildSettings.MAX_SECONDS)
                    await interaction.reply({content: `Min: ${minSetting}s | Max: ${maxSetting}s`, ephemeral: true});
                } else {
                    await guild.upsertSetting(GuildSettings.MIN_SECONDS, min, true);
                    await guild.upsertSetting(GuildSettings.MAX_SECONDS, max, true);
                    await interaction.reply({content: `Set => Min: ${min}s | Max: ${max}s`, ephemeral: true});
                }
                break;
            case 'rate-limiting':
                const limit = interaction.options.getBoolean('limiting');
                if(limit === null || limit === undefined) {
                    const limitSetting = await guild.getSettingValue<boolean>(GuildSettings.RATE_LIMIT_MODE);
                    await interaction.reply({content: `Rate Limiting: ${limitSetting ? 'ENABLED' : 'DISABLED'}`, ephemeral: true});
                } else {
                    await guild.upsertSetting(GuildSettings.RATE_LIMIT_MODE, limit, true);
                    await interaction.reply({content: `Set => Rate Limiting: ${limit ? 'ENABLED' : 'DISABLED'}`, ephemeral: true});
                }
                break;
            case 'category-showcase':
                const showcaseCategoryChannel = interaction.options.getChannel('name') as CategoryChannel | undefined;
                if(showcaseCategoryChannel === undefined || showcaseCategoryChannel === null) {
                    const showcaseChannel = await guild.getSettingValue<string>(GuildSettings.CATEGORY_SHOWCASE);
                    let val = 'None Set';
                    if(showcaseChannel !== undefined) {
                        const channel = interaction.guild.channels.resolve(showcaseChannel);
                        val = channel.name;
                    }
                    await interaction.reply({content: val, ephemeral: true});
                } else {
                    await guild.upsertSetting(GuildSettings.CATEGORY_SHOWCASE, showcaseCategoryChannel.id, true);
                    await interaction.reply({content: `Set Showcase Category => ${showcaseCategoryChannel.name}`, ephemeral: true});
                }
                break;
            case 'category-oc':
                const ocCategoryChannel = interaction.options.getChannel('name') as CategoryChannel | undefined;
                if(ocCategoryChannel === undefined || ocCategoryChannel === null) {
                    const ocChannel = await guild.getSettingValue<string>(GuildSettings.CATEGORY_OC);
                    let val = 'None Set';
                    if(ocChannel !== undefined) {
                        const channel = interaction.guild.channels.resolve(ocChannel);
                        val = channel.name;
                    }
                    await interaction.reply({content: val, ephemeral: true});
                } else {
                    await guild.upsertSetting(GuildSettings.CATEGORY_OC, ocCategoryChannel.id, true);
                    await interaction.reply({content: `Set OC Category => ${ocCategoryChannel.name}`, ephemeral: true});
                }
                break;
            default:
                await interaction.reply({
                    content: `Unrecognized command: ${interaction.options.getSubcommand()}`,
                    ephemeral: true
                });
        }
    }
}
