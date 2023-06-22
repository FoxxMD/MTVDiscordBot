import {Collection, Events, REST, Routes} from "discord.js";
import path from "path";
import * as fs from "fs";
import {BotClient} from "../BotClient.js";
import {Sequelize} from "sequelize";
import {DiscordCredentials} from "../common/infrastructure/OperatorConfig.js";
import {ErrorWithCause} from "pony-cause";
import {Logger} from "@foxxmd/winston";
import {mergeArr} from "../utils/index.js";

export const initCommands = async (client: BotClient, credentials: DiscordCredentials, db: Sequelize, parentLogger: Logger) => {

    const logger = parentLogger.child({labels: ['Commands']}, mergeArr);

    const slashCommandData = [];

    client.commands = new Collection();
    const foldersPath = path.join(__dirname, 'commands');
    const commandFolders = fs.readdirSync(foldersPath);

    try {

        // setting commands on client for later interaction handling
        for (const folder of commandFolders) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const command = require(filePath);
                // Set a new item in the Collection with the key as the command name and the value as the exported module
                if ('data' in command && 'execute' in command) {
                    // @ts-ignore
                    client.commands.set(command.data.name, command);
                    // gather json for registering commands
                    slashCommandData.push(command.data.toJSON());
                } else {
                    logger.warn(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
                }
            }
        }
    } catch (e) {
        throw e;
    }

    logger.info(`Found ${slashCommandData.length} commands in ${commandFolders.length} folders`);

    // setup event listener for handling interactions
    client.on(Events.InteractionCreate, async interaction => {
        if (!interaction.isChatInputCommand()) return;

        const command = (interaction.client as BotClient).commands.get(interaction.commandName);

        if (!command) {
            logger.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        try {
            await command.execute(interaction, db, logger);
        } catch (error) {
            console.error(error);
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                });
            } else {
                await interaction.reply({content: 'There was an error while executing this command!', ephemeral: true});
            }
        }
    });

    return slashCommandData;
}

export const registerGuildCommands = async (credentials: DiscordCredentials, guildId: string, slashCommandData: any[], logger: Logger) => {
    // register commands

    if(slashCommandData.length === 0) {
        logger.info('No commands to register!', {leaf: 'Commands'});
        return;
    }

    const rest = new REST().setToken(credentials.token);
    try {
        logger.info(`Started refreshing ${slashCommandData.length} application (/) commands.`);

        // The put method is used to fully refresh all commands in the guild with the current set
        const data = await rest.put(
            Routes.applicationGuildCommands(credentials.clientId, guildId),
            {body: slashCommandData},
        ) as any[];

        logger.info(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        // And of course, make sure you catch and log any errors!
        throw new ErrorWithCause(`Failed to register slash commands for guild ${guildId}`, {cause: error});
    }
}
