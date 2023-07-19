import {
    ApiSupportedPlatforms,
    InteractionLike,
    MinimalCreatorDetails
} from "../../common/infrastructure/Atomic.js";
import {
    ActionRowBuilder,
    CacheType,
    ChatInputCommandInteraction,
    StringSelectMenuBuilder, StringSelectMenuInteraction,
    StringSelectMenuOptionBuilder
} from "discord.js";
import {Creator} from "../../common/db/models/creator.js";
import {PlatformManager} from "../../common/contentPlatforms/PlatformManager.js";
import {commaLists} from "common-tags";
import {Op} from "sequelize";
import {MessageActionRowComponentBuilder} from "@discordjs/builders";
import {Bot} from "../Bot.js";


export interface CreatorCommandParsingOptions {
    link?: string
    id?: string
    name?: string
}

export const getCreatorFromCommand = async (initialInteraction: ChatInputCommandInteraction<CacheType>, bot: Bot, options?: CreatorCommandParsingOptions): Promise<[InteractionLike, Creator?]> => {
    const {
        link: linkName = 'link',
        id: idName = 'id',
        name: nameName = 'name'
    } = options || {};

    let interaction: InteractionLike = initialInteraction;

    const link = interaction.options.getString(linkName);
    const id = interaction.options.getString(idName);
    const name = interaction.options.getString(nameName);

    let creator: Creator;

    if (link !== null && link !== undefined) {
        const manager = new PlatformManager(bot.config.credentials, bot.logger);

        const [deets, urlDetails, video] = await manager.getVideoDetails(link);

        if (!ApiSupportedPlatforms.includes(deets.platform)) {
            await interaction.reply({
                content: commaLists`The platform for this video (${deets.platform}) is not supported by the API. Platform must be one of: ${ApiSupportedPlatforms}`,
                ephemeral: true
            })
            return [interaction];
        }
        creator = await manager.upsertCreatorFromDetails(deets.platform, deets.creator as MinimalCreatorDetails);
    } else if (id !== null && id !== undefined) {
        creator = await Creator.findByPk(id);
        if (creator === null || creator === undefined) {
            await interaction.reply({
                content: `No Creator exists with the ID ${id}`,
                ephemeral: true
            })
            return [interaction];
        }
    } else if (name !== null && name !== undefined) {
        const creators = await Creator.findAll({where: {name: {[Op.like]: `%${name}%`}}});
        if (creators.length == 0) {
            await interaction.reply({
                content: `No creator names contained '${name}'`,
                ephemeral: true
            });
            return [interaction];
        }
        if (creators.length === 1) {
            creator = creators[0];
        } else {

            const select = new StringSelectMenuBuilder()
                .setCustomId('creator')
                .setPlaceholder('Choose a Creator');

            for (const c of creators) {
                select.addOptions(new StringSelectMenuOptionBuilder()
                    .setLabel(c.name)
                    .setDescription(`${c.platform} - ${c.platformId}`)
                    .setValue(c.id.toString()))
            }
            const row = new ActionRowBuilder<MessageActionRowComponentBuilder>()
                .addComponents(select);

            const creatorResponse = await interaction.reply({
                content: `Multiple creators found containing '${name}', select one,`,
                components: [row],
                ephemeral: true
            });
            const collectorFilter = i => i.user.id === interaction.user.id;

            let confirmation: StringSelectMenuInteraction;
            try {
                confirmation = await creatorResponse.awaitMessageComponent({
                    filter: collectorFilter,
                    time: 30000
                }) as StringSelectMenuInteraction;
                interaction = confirmation;
            } catch (e) {
                await interaction.editReply({
                    content: 'No selection received within 30 seconds, cancelling',
                    components: [],
                })
                return [interaction];
            }
            const creatorId = Number.parseInt(confirmation.values[0]);
            creator = await Creator.findByPk(creatorId);
        }
    } else {
        await interaction.reply({
            content: `Must provide one of:  ${linkName}, ${idName}, or ${nameName}`,
            ephemeral: true
        })
        return [interaction];
    }
    return [interaction, creator];
}
