import {
    CacheType,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    roleMention,
    GuildMember,
    GuildMemberRoleManager,
    Role,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    StringSelectMenuOptionBuilder, StringSelectMenuInteraction,
    time
} from "discord.js";
import {getOrInsertUser} from "../../../bot/functions/repository.js";
import {Logger} from "@foxxmd/winston";
import {Bot} from "../../../bot/Bot.js";
import {
    ApiSupportedPlatforms,
    InteractionLike,
    MinimalCreatorDetails,
    SpecialRoleType
} from "../../../common/infrastructure/Atomic.js";
import {capitalize, interact} from "../../../utils/index.js";
import {markdownTag} from "../../../utils/StringUtils.js";
import {Creator} from "../../../common/db/models/creator.js";
import {getDurationFromCommand} from "../../../bot/functions/dateInteraction.js";
import dayjs from "dayjs";
import {ErrorWithCause} from "pony-cause";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('users')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDescription('Manage Users')
        .addSubcommand(subCommand =>
            subCommand.setName('flag-deny')
                .setDescription(`Disallow a User from submitting`)
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Discord user')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('reason')
                        .setDescription('Reason for adding to deny list'))
                .addStringOption(opt =>
                    opt.setName('expires-at')
                        .setDescription(`EX: '2 days' or leave empty for never`))
        )
        .addSubcommand(subCommand =>
            subCommand.setName('flag-expire')
                .setDescription(`Expire any active allow/deny flag`)
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Discord user')
                        .setRequired(true))
        )
    ,
    async execute(initialInteraction: ChatInputCommandInteraction<CacheType>, logger: Logger, bot: Bot) {

        let interaction: InteractionLike = initialInteraction;

        const [_, duration] = await getDurationFromCommand(initialInteraction, {currentInteraction: interaction});

        const command = initialInteraction.options.getSubcommand();

        switch (command) {
            case 'flag-allow':
            case 'flag-deny':
            case 'flag-expire':
                const user = await getOrInsertUser(interaction.member, interaction.guild);
                const reason = initialInteraction.options.getString('reason') ?? `Add via ${command} command`;

                const discordUser = initialInteraction.options.getMember('user') as GuildMember | undefined | null;
                if (discordUser !== undefined && discordUser !== null && discordUser.user.bot) {
                    return await interaction.reply({
                        content: 'Cannot perform this action on a Bot user',
                        ephemeral: true
                    });
                }
                const assocUser = await getOrInsertUser(discordUser as GuildMember, interaction.guild);

                if(interaction.replied) {
                    return;
                }
                if(command === 'flag-expire') {
                    await assocUser.expireModifiers(undefined);
                    await assocUser.save();
                    logger.info(`Expired any existing flags on ${user.name}`, {sendToGuild: true, byDiscordUser: interaction.member.user.id});
                    await interact(interaction, {
                        content: `Expired any existing flags on ${user.name}`,
                        ephemeral: true
                    });
                } else {
                    const t = await Creator.sequelize.transaction();
                    await assocUser.expireModifiers(undefined, t);
                    const mod = await assocUser.createModifier({
                        flag: command.includes('allow') ? 'allow' : 'deny',
                        createdById: user.id,
                        reason,
                        expiresAt: duration === undefined ? undefined : dayjs().add(duration).toDate()
                    });
                    try {
                        await t.commit();
                    } catch (e) {
                        // @ts-expect-error
                        logger.error(new ErrorWithCause(`Error occurred while setting '${command}' modifier`, {cause: e}), {sendToGuild: true, byDiscordUser: interaction.member.user.id});
                        await interact(interaction, {content: `Error occurred while committing changes`, ephemeral: true});
                        return;
                    }
                    const msg = `Added ${assocUser.name} to ${command.includes('allow') ? 'ALLOW' : 'DENY'} list. Expires: ${duration === undefined ? 'Never' : time(mod.expiresAt)}`;
                    logger.info(msg, {sendToGuild: true, byDiscordUser: interaction.member.user.id});
                    await interact(interaction, {
                        content: msg,
                        ephemeral: true
                    });
                }
                break;
            default:
                await interaction.reply({
                    content: `Unrecognized command: ${command}`,
                    ephemeral: true
                });
        }
    }
}
