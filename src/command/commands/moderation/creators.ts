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
import {getOrInsertGuild, getOrInsertUser} from "../../../bot/functions/repository.js";
import {Logger} from "@foxxmd/winston";
import {GuildSettings} from "../../../common/db/models/GuildSettings.js";
import {Bot} from "../../../bot/Bot.js";
import {
    ApiSupportedPlatforms,
    InteractionLike,
    MinimalCreatorDetails,
    SpecialRoleType
} from "../../../common/infrastructure/Atomic.js";
import {capitalize, interact, RateLimitFunc} from "../../../utils/index.js";
import {markdownTag} from "../../../utils/StringUtils.js";
import {commaLists, stripIndent} from "common-tags";
import {getContentCreatorDiscordRole} from "../../../bot/functions/guildUtil.js";
import {ErrorWithCause} from "pony-cause";
import {Creator} from "../../../common/db/models/creator.js";
import {getCreatorFromCommand} from "../../../bot/functions/creatorInteractions.js";
import {getDurationFromCommand} from "../../../bot/functions/dateInteraction.js";
import dayjs from "dayjs";
import {MTVLogger} from "../../../common/logging.js";
import {Transaction} from "sequelize";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('creators')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDescription('Manage creators')
        .addSubcommand(subCommand =>
            subCommand.setName('user-remove')
                .setDescription('Associate a discord user with a creator channel')
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Discord user to associate')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('link')
                        .setDescription('A supported video associated with the creator')
                        .setRequired(true))
        )
        .addSubcommand(subCommand =>
            subCommand.setName('user-add')
                .setDescription(`Remove a user's association with a creator channel`)
                .addUserOption(opt =>
                    opt.setName('user')
                        .setDescription('Discord user to disassociate')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('link')
                        .setDescription('A supported video associated with the creator')
                        .setRequired(true))
        )
        .addSubcommand(subCommand =>
            subCommand.setName('flag-allow')
                .setDescription(`Allow a Creator to bypass self-promo`)
                .addStringOption(opt =>
                    opt.setName('link')
                        .setDescription('Find creator by video link'))
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('Find creator by ID'))
                .addStringOption(opt =>
                    opt.setName('name')
                        .setDescription('Find creator by name (with confirmation)'))
                .addStringOption(opt =>
                    opt.setName('reason')
                        .setDescription('Reason for adding to allow list'))
                .addAttachmentOption(opt =>
                    opt.setName('file')
                        .setDescription('Allow creators from CSV'))
                .addStringOption(opt =>
                    opt.setName('expires-at')
                        .setDescription(`EX: '2 days' or leave empty for never`))
        )
        .addSubcommand(subCommand =>
            subCommand.setName('flag-deny')
                .setDescription(`Disallow a Creator from being used in Submissions`)
                .addStringOption(opt =>
                    opt.setName('link')
                        .setDescription('Find creator by video link'))
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('Find creator by ID'))
                .addStringOption(opt =>
                    opt.setName('name')
                        .setDescription('Find creator by name (with confirmation)'))
                .addAttachmentOption(opt =>
                    opt.setName('file')
                        .setDescription('Deny creators from CSV'))
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
                .addStringOption(opt =>
                    opt.setName('link')
                        .setDescription('Find creator by video link'))
                .addStringOption(opt =>
                    opt.setName('id')
                        .setDescription('Find creator by ID'))
                .addStringOption(opt =>
                    opt.setName('name')
                        .setDescription('Find creator by name (with confirmation)'))
                .addAttachmentOption(opt =>
                    opt.setName('file')
                        .setDescription('Expire creators from CSV'))

        )
    ,
    async execute(initialInteraction: ChatInputCommandInteraction<CacheType>, logger: MTVLogger, bot: Bot) {

        let interaction: InteractionLike = initialInteraction;

        const guild = await getOrInsertGuild(interaction.guild, logger);

        const [_, duration] = await getDurationFromCommand(initialInteraction, {currentInteraction: interaction});
        const [creatorInteraction, creators] = await getCreatorFromCommand(interaction, bot, logger, {allowFile: true});
        if(creators.length === 0) {
            return;
        }
        // user commands only use one creator at a time
        const creator = creators[0];
        interaction = creatorInteraction;

        const command = initialInteraction.options.getSubcommand();

        switch (command) {
            case 'user-add':
            case 'user-remove':

                const discordUser = initialInteraction.options.getMember('user') as GuildMember | undefined | null;
                if (discordUser !== undefined && discordUser !== null && discordUser.user.bot) {
                    return await interaction.reply({
                        content: 'Cannot perform this action on a Bot user',
                        ephemeral: true
                    });
                }
                const assocUser = await getOrInsertUser(discordUser as GuildMember, interaction.guild);

                const existingCreators = await assocUser.getCreators();

                if (command === 'user-add') {
                    if (!existingCreators.some(x => x.id === creator.id)) {
                        await assocUser.addCreator(creator);
                        await assocUser.save();
                    }
                    let ccRole: Role;
                    try {
                        ccRole = await getContentCreatorDiscordRole(guild, interaction.guild);
                    } catch (e) {
                        const err = new ErrorWithCause('User was successfully associated with creator but did not receive Content Creator role due to an error', {cause: e});
                        logger.warn(err, {sendToGuild: true, byDiscordUser: interaction.member.user.id});
                        return interaction.reply({
                            content: `User was successfully associated with creator but did not receive Content Creator role due to an error: ${e.message}`,
                            ephemeral: true
                        });
                    }
                    await (discordUser.roles as GuildMemberRoleManager).add(ccRole);
                    const msg = `User ${assocUser.name} was successfully associated with Creator ${creator.name} and received the Content Creator role`;
                    logger.info(msg, {sendToGuild: true, byDiscordUser: interaction.member.user.id});
                    return interaction.reply({
                        content: msg,
                        ephemeral: true
                    });
                }
                const replyParts: string[] = [];
                const updatedExistingCreators = existingCreators.filter(x => x.id !== creator.id)
                if (updatedExistingCreators.length !== existingCreators.length) {
                    await assocUser.removeCreator(creator);
                    await assocUser.save();
                    replyParts.push(`User ${assocUser.name} was successfully disassociated from Creator ${creator.name}`);
                } else {
                    replyParts.push(`User ${assocUser.name} was already not associated with Creator ${creator.name}`);
                }


                if (updatedExistingCreators.length === 0) {
                    // no more creators left for user!
                    let ccRole: Role;
                    try {
                        ccRole = await getContentCreatorDiscordRole(guild, interaction.guild);
                    } catch (e) {
                        logger.warn(new ErrorWithCause('Could not remove Content Creator discord role', {cause: e}));
                        replyParts.push(`but could not determine if Content Creator discord role should be removed due to an error when fetching role: ${e.message}`);
                    }
                    if (ccRole !== undefined) {
                        const roleManager = discordUser.roles as GuildMemberRoleManager;
                        if (roleManager.cache.has(ccRole.id)) {
                            await roleManager.remove(ccRole);
                            replyParts.push(`and removed Content Creator role`);
                        }
                    }
                }

                logger.info(replyParts.join(' '), {sendToGuild: true, byDiscordUser: interaction.member.user.id});
                await interaction.reply({
                    content: replyParts.join(' '),
                    ephemeral: true
                });
                break;

            case 'flag-allow':
            case 'flag-deny':
            case 'flag-expire':
                const user = await getOrInsertUser(interaction.member, interaction.guild);
                const reason = initialInteraction.options.getString('reason') ?? `Add via ${command} command`;

                const statusUpdate = new RateLimitFunc(5000, false, logger);
                if(command === 'flag-expire') {
                    let index = 0;
                    let t = await Creator.sequelize.transaction();
                    for (const c of creators) {
                        await creator.expireModifiers(undefined, t);
                        //await creator.save({transaction: t});
                        index++;
                        await statusUpdate.exec(async () => {
                            await interact(interaction, {
                                content: `Expired flags on ${index} of ${creators.length} creators`,
                            }, {edit: true});
                            logger.debug(`Expired flags on ${index} of ${creators.length} creators`);
                        }, index % 10 === 0);
                        if(index % 50 === 0) {
                            await t.commit();
                            t = await Creator.sequelize.transaction();
                        }
                    }

                    logger.info(`Expired any existing flags on ${creators.length === 1 ? creator.name : `${creators.length} creators`}`, {sendToGuild: true, byDiscordUser: interaction.member.user.id});
                    await interact(interaction, {
                        content: `Expired any existing flags on ${creators.length === 1 ? creator.name : `${creators.length} creators`}`,
                        ephemeral: true
                    });
                } else {
                    const exp = duration === undefined ? undefined : dayjs().add(duration).toDate()
                    let index = 0;
                    let t: Transaction | undefined = await Creator.sequelize.transaction();
                    for (const c of creators) {
                        if(t === undefined) {
                            t =  await Creator.sequelize.transaction();
                        }
                        // if(!c.isPopular()) {
                        //     await c.expireModifiers(undefined, t);
                        //     await c.createModifier({
                        //         flag: command.includes('allow') ? 'allow' : 'deny',
                        //         createdById: user.id,
                        //         reason,
                        //         expiresAt: exp
                        //     }, {transaction: t});
                        // }
                        index++;
                        await statusUpdate.exec(async () => {
                            await interact(interaction, {
                                content: `Added ${command.includes('allow') ? 'ALLOW' : 'DENY'} flags on ${index} of ${creators.length} creators`,
                            }, {edit: true});
                            logger.debug(`Expired flags on ${index} of ${creators.length} creators`);
                        }, index % 10 === 0);
                        if(index % 100 === 0) {
                            await t.commit();
                            t = undefined;
                        }
                    }
                    if(t !== undefined) {
                        await t.commit();
                    }
                    const msg = `Added ${creators.length === 1 ? creator.name : `${creators.length} creators`} to ${command.includes('allow') ? 'ALLOW' : 'DENY'} list. Expires: ${exp === undefined ? 'Never' : time(exp)}`;
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
