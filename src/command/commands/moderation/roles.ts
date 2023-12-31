import {
    CacheType,
    ChatInputCommandInteraction,
    SlashCommandBuilder,
    PermissionFlagsBits,
    roleMention
} from "discord.js";
import {getOrInsertGuild} from "../../../bot/functions/repository.js";
import {Logger} from "@foxxmd/winston";
import {GuildSettings} from "../../../common/db/models/GuildSettings.js";
import {Bot} from "../../../bot/Bot.js";
import {SpecialRoleType} from "../../../common/infrastructure/Atomic.js";
import {capitalize} from "../../../utils/index.js";
import {markdownTag} from "../../../utils/StringUtils.js";
import {ROLE_TYPES} from "../../../common/db/models/SpecialRole.js";
import {stripIndent} from "common-tags";
import * as repl from "repl";

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roles')
        .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
        .setDescription('Display or edit associated roles for MTV Bot')
        .addSubcommand(subCommand =>
            subCommand.setName('add')
                .setDescription('Associate an existing role')
                .addRoleOption(opt =>
                    opt.setName('role')
                        .setDescription('Role to add')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Type to associate as')
                        .setRequired(true)
                        .addChoices({
                                name: 'Approved', value: 'approved'
                            },
                            {
                                name: 'Janitor', value: 'janitor'
                            },
                            {
                                name: 'Read TOS', value: 'tos'
                            }))
        )
        .addSubcommand(subCommand =>
            subCommand.setName('remove')
                .setDescription('Remove existing role')
                .addRoleOption(opt =>
                    opt.setName('role')
                        .setDescription('Role to remove')
                        .setRequired(true))
        )
        .addSubcommand(subCommand =>
            subCommand.setName('set')
                .setDescription('Set singular role association')
                .addRoleOption(opt =>
                    opt.setName('role')
                        .setDescription('Role to associate')
                        .setRequired(true))
                .addStringOption(opt =>
                    opt.setName('type')
                        .setDescription('Type to associate as')
                        .setRequired(true)
                        .addChoices({
                            name: 'Content Creator', value: 'contentCreator'
                        }))
        )
        .addSubcommand(subCommand =>
            subCommand.setName('display')
                .setDescription('Show all role associations')
        )
    ,
    async execute(interaction: ChatInputCommandInteraction<CacheType>, logger: Logger, bot: Bot) {

        const guild = await getOrInsertGuild(interaction.guild, logger);

        switch (interaction.options.getSubcommand()) {
            case 'add':
                const role = interaction.options.getRole('role');
                const roleType = interaction.options.getString('type') as SpecialRoleType;
                const existingRoles = await guild.getRoleIdsByType(roleType);
                if (existingRoles.includes(role.id)) {
                    await interaction.reply({
                        content: `Role ${role.name} already associated as ${capitalize(roleType)}`,
                        ephemeral: true
                    });
                    return;
                }
                await guild.createRole({
                    roleType,
                    discordRoleName: role.name,
                    discordRoleId: role.id
                });
                await interaction.reply({
                    content: `Role ${role.name} associated as ${capitalize(roleType)}`,
                    ephemeral: true
                });
                break;
            case 'remove':
                const roleToRemove = interaction.options.getRole('role');
                const existingRole = await guild.getRoleById(roleToRemove.id);
                if (existingRole === undefined) {
                    await interaction.reply({
                        content: `Role ${roleToRemove.name} is not associated.`,
                        ephemeral: true
                    });
                    return;
                }
                await guild.removeRole(existingRole);
                break;
            case 'set':
                const roleToAssociate = interaction.options.getRole('role');
                const singularRoleType = interaction.options.getString('type') as SpecialRoleType;

                const existingSingularRole = await guild.getRolesByType(singularRoleType);
                const replyParts: string[] = [];
                if(existingSingularRole.length > 0) {
                    replyParts.push(`Removed existing association with role ${existingSingularRole[0].discordRoleName} and`);
                    await guild.removeRole(existingSingularRole[0]);
                }
                await guild.createRole({
                    roleType: singularRoleType,
                    discordRoleName: roleToAssociate.name,
                    discordRoleId: roleToAssociate.id
                });
                replyParts.push(`Added ${roleToAssociate.name} as ${singularRoleType}`);
                await interaction.reply({
                    content: replyParts.join(''),
                    ephemeral: true
                });
                break;
            case 'display':
                const approvedRoles = await guild.getRolesByType(ROLE_TYPES.APPROVED);
                const janitorRoles = await guild.getRolesByType(ROLE_TYPES.JANITOR);
                const tosRoles = await guild.getRolesByType(ROLE_TYPES.TOS);
                const contentCreatorRole = await guild.getRolesByType(ROLE_TYPES.CONTENT_CREATOR);

                const approvedContent = approvedRoles.length === 0 ? 'No associated roles.' : markdownTag`
                ${approvedRoles.map(x => roleMention(x.discordRoleId))}
                `;

                const janitorContent = janitorRoles.length === 0 ? 'No associated roles.' : markdownTag
                    `
                ${janitorRoles.map(x => roleMention(x.discordRoleId))}
                `;

                const tosContent = tosRoles.length === 0 ? 'No associated roles (users not required to read rules before submitting)' : markdownTag
                    `
                ${tosRoles.map(x => roleMention(x.discordRoleId))}
                `;

                const ccContent = contentCreatorRole.length === 0 ? 'No associated roles' : markdownTag
                    `
                ${contentCreatorRole.map(x => roleMention(x.discordRoleId))}
                `;

                await interaction.reply({
                    content: stripIndent`
                    **Approved**
                    
                    ${approvedContent}
                    
                    **Janitor**
                    
                    ${janitorContent}
                    
                    **Content Creator**
                    
                    ${ccContent}
                    
                    **Read TOS**
                    
                    ${tosContent}
                    `,
                    ephemeral: true
                });
                break;
            default:
                await interaction.reply({
                    content: `Unrecognized command: ${interaction.options.getSubcommand()}`,
                    ephemeral: true
                });
        }
    }
}
