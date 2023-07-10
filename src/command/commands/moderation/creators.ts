import {
    CacheType,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    roleMention, GuildMember, GuildMemberRoleManager, Role
} from "discord.js";
import {getOrInsertGuild, getOrInsertUser} from "../../../bot/functions/repository.js";
import {Logger} from "@foxxmd/winston";
import {GuildSettings} from "../../../common/db/models/GuildSettings.js";
import {Bot} from "../../../bot/Bot.js";
import {ApiSupportedPlatforms, MinimalCreatorDetails, SpecialRoleType} from "../../../common/infrastructure/Atomic.js";
import {capitalize} from "../../../utils/index.js";
import {markdownTag} from "../../../utils/StringUtils.js";
import {ROLE_TYPES} from "../../../common/db/models/SpecialRole.js";
import {commaLists, stripIndent} from "common-tags";
import {PlatformManager} from "../../../common/contentPlatforms/PlatformManager.js";
import {getContentCreatorDiscordRole} from "../../../bot/functions/guildUtil.js";
import {ErrorWithCause} from "pony-cause";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('creators')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDescription('Manage creator associations')
        .addSubcommand(subCommand =>
            subCommand.setName('add')
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
            subCommand.setName('remove')
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
    ,
    async execute(interaction: ChatInputCommandInteraction<CacheType>, logger: Logger, bot: Bot) {

        const guild = await getOrInsertGuild(interaction.guild, logger);

        const discordUser = interaction.options.getMember('user') as GuildMember;
        if(discordUser.user.bot) {
            return await interaction.reply({
                content: 'Cannot perform this action on a Bot user',
                ephemeral: true
            })
        }
        const user = await getOrInsertUser(discordUser as GuildMember, interaction.guild);
        const link = interaction.options.getString('link');

        const manager = new PlatformManager(bot.config.credentials, bot.logger);

        const [deets, video] = await manager.getVideoDetails(link);

        if (!ApiSupportedPlatforms.includes(deets.platform)) {
            return await interaction.reply({
                content: commaLists`The platform for this video (${deets.platform}) is not supported by the API. Platform must be one of: ${ApiSupportedPlatforms}`,
                ephemeral: true
            });
        }

        const creator = await manager.upsertCreatorFromDetails(deets.platform, deets.creator as MinimalCreatorDetails);

        const command = interaction.options.getSubcommand();

        const existingCreators = await user.getCreators();

        if (command === 'add') {
            if (!existingCreators.some(x => x.id === creator.id)) {
                await user.addCreator(creator);
                await user.save();
            }
            let ccRole: Role;
            try {
                ccRole = await getContentCreatorDiscordRole(guild, interaction.guild);
            } catch (e) {
                logger.warn(new ErrorWithCause('Could not add Content Creator discord role', {cause: e}));
                return interaction.reply({
                    content: `User was successfully associated with creator but did not receive Content Creator role due to an error: ${e.message}`,
                    ephemeral: true
                });
            }
            await (discordUser.roles as GuildMemberRoleManager).add(ccRole);
            return interaction.reply({
                content: `User was successfully associated with creator and received the Content Creator role`,
                ephemeral: true
            });
        } else if (command === 'remove') {
            const replyParts: string[] = [];
            const updatedExistingCreators = existingCreators.filter(x => x.id !== creator.id)
            if (updatedExistingCreators.length !== existingCreators.length) {
                await user.removeCreator(creator);
                await user.save();
                replyParts.push('User was successfully disassociated from creator');
            } else {
                replyParts.push('User was already not associated with creator');
            }


            if(updatedExistingCreators.length === 0) {
                // no more creators left for user!
                let ccRole: Role;
                try {
                    ccRole = await getContentCreatorDiscordRole(guild, interaction.guild);
                } catch (e) {
                    logger.warn(new ErrorWithCause('Could not remove Content Creator discord role', {cause: e}));
                    replyParts.push(`but could not determine if Content Creator discord role should be removed due to an error when fetching role: ${e.message}`);
                }
                if(ccRole !== undefined) {
                    const roleManager = discordUser.roles as GuildMemberRoleManager;
                    if(roleManager.cache.has(ccRole.id)) {
                        await roleManager.remove(ccRole);
                        replyParts.push(`and removed Content Creator role`);
                    }
                }
            }

            await interaction.reply({
                content: replyParts.join(' '),
                ephemeral: true
            });

        } else {
            await interaction.reply({
                content: `Unrecognized command: ${command}`,
                ephemeral: true
            });
        }
    }
}
