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
import {commaListsOr, commaLists} from "common-tags";
import {Op} from "sequelize";
import {MessageActionRowComponentBuilder} from "@discordjs/builders";
import {Bot} from "../Bot.js";
import fetch from 'node-fetch';
import {ErrorWithCause} from "pony-cause";
import {MTVLogger} from "../../common/logging.js";
import {processCsvStream} from "../../utils/io.js";
import dayjs from "dayjs";


export interface CreatorCommandParsingOptions {
    link?: string
    id?: string
    name?: string,
    file?: string,
    allowFile?: boolean
}

export const getCreatorFromCommand = async (initialInteraction: ChatInputCommandInteraction<CacheType>, bot: Bot, logger: MTVLogger, options?: CreatorCommandParsingOptions): Promise<[InteractionLike, Creator[]?]> => {
    const {
        link: linkName = 'link',
        id: idName = 'id',
        name: nameName = 'name',
        file: fileName = 'file',
        allowFile = false,
    } = options || {};

    let interaction: InteractionLike = initialInteraction;

    const link = interaction.options.getString(linkName);
    const id = interaction.options.getString(idName);
    const name = interaction.options.getString(nameName);
    const file = interaction.options.getAttachment(fileName);

    const manager = new PlatformManager(bot.config.credentials, bot.logger);

    let creators: Creator[] = [];

    if (link !== null && link !== undefined) {

        const [deets, urlDetails, video] = await manager.getVideoDetails(link);

        if (!ApiSupportedPlatforms.includes(deets.platform)) {
            await interaction.reply({
                content: commaListsOr`The platform for this video (${deets.platform}) is not supported by the API. Platform must be one of: ${ApiSupportedPlatforms}`,
                ephemeral: true
            })
            return [interaction];
        }
        creators.push(await manager.upsertCreatorFromDetails(deets.platform, deets.creator as MinimalCreatorDetails));
    } else if (id !== null && id !== undefined) {
        const creator = await Creator.findByPk(id);
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
            creators.push(creators[0]);
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
            creators.push(await Creator.findByPk(creatorId));
        }
    } else if (allowFile && file !== null && file !== undefined) {
        if (!file.name.includes('.csv')) {
            await interaction.reply({
                content: 'File type must be .csv',
                ephemeral: true
            });
            return [interaction];
        }
        await interaction.deferReply({ephemeral: true});
        try {
            logger.debug(`Getting creator records from ${file.url}...`);
            const content = await fetch(file.url);
            const records = await processCsvStream<CreatorRowObject>(content.body);
            const total = records.length;
            logger.debug(`Found ${total} records`);
            let processed = 0;
            let lastUpdate = dayjs();
            let errors = 0;
            await interaction.editReply({content: `Extracting Creators, processed ${processed} of ${total}`});
            for (const rec of records) {
                // TODO add way to build creator from provider/name, only URL for now
                if (rec.url !== undefined) {
                    try {
                        const [deets, urlDetails, video, extractedCreator] = await manager.getVideoDetails(rec.url, true);
                        if (extractedCreator !== undefined) {
                            creators.push(extractedCreator);
                        }
                    } catch (e) {
                        logger.warn(new ErrorWithCause('Failed to parse Video from URL', {cause: e}));
                        errors++;
                        continue;
                    }

                }
                processed++;
                if (processed % 20 === 0 && dayjs().diff(lastUpdate, 'ms') > 10000) {
                    logger.debug(`Extracting Creators, processed ${processed} of ${total}`);
                    await interaction.editReply({content: `Extracting Creators, processed ${processed} of ${total} (${errors} errors)`});
                    lastUpdate = dayjs();
                }
            }
            await interaction.editReply({content: `${processed} Creators extracted (${errors} errors)`});
        } catch (e) {
            logger.error(new ErrorWithCause(`Error occurred while trying to get attachment ${file.url}`, {cause: e}), {
                sendToGuild: true,
                byDiscordUser: interaction.member.user.id
            });
            await interaction.editReply({content: 'Error occurred while trying to get attachment'});
            return [interaction];
        }
    } else {
        const validInput = [linkName, idName,nameName];
        if(allowFile) {
            validInput.push(fileName);
        }
        await interaction.reply({
            content: commaListsOr`Must provide one of: ${validInput}`,
            ephemeral: true
        })
        return [interaction];
    }
    return [interaction, creators];
}

export interface CreatorRowObject {
    provider?: string
    name?: string
    url?: string
    [key: string]: any
}
