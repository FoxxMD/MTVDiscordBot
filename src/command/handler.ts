import {Collection, Events, REST, Routes, Guild as DiscordGuild, TextBasedChannel, userMention} from "discord.js";
import path from "path";
import * as fs from "fs";
import {BotClient} from "../BotClient.js";
import {Sequelize} from "sequelize";
import {DiscordCredentials} from "../common/infrastructure/OperatorConfig.js";
import {ErrorWithCause} from "pony-cause";
import {format, Logger} from "@foxxmd/winston";
import {interact, mergeArr} from "../utils/index.js";
import {Bot} from "../bot/Bot.js";
import {LogInfo} from "../common/infrastructure/Atomic.js";
import {isLogLineMinLevel} from "../common/logging.js";
import {Guild} from "../common/db/models/Guild.js";
import {getOrInsertGuild} from "../bot/functions/repository.js";
import {MESSAGE, SPLAT} from "triple-beam";
import {GuildSettings} from "../common/db/models/GuildSettings.js";
import {detectErrorStack} from "../utils/StringUtils.js";
import ReadableStream = NodeJS.ReadableStream;

export const initCommands = async (client: BotClient, credentials: DiscordCredentials, bot: Bot) => {

    const logger = bot.logger.child({labels: ['Commands']}, mergeArr);
    const guildLoggers = new Map<string, Logger>();
    const getCommandLogger = (guildId: string, commandName: string) => {
        let gl = guildLoggers.get(`${guildId}-${commandName}`);
        if(gl === undefined) {
            gl = bot.logger.child({labels: [`Guild ${guildId}`, `CMD ${commandName}`], discordGuild: guildId}, mergeArr);
            guildLoggers.set(guildId, gl);
        }
        return gl;
    }

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
            logger.warn(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        let commandId = interaction.commandName;
        const subCommand = interaction.options.getSubcommand(false);
        if(subCommand !== null) {
            commandId = `${commandId} -> ${subCommand}`;
        }
        const commandLogger = getCommandLogger(interaction.guildId, commandId);

        try {
            await command.execute(interaction, commandLogger, bot);
            commandLogger.debug(`Executed for ${interaction.user.tag}`, {commandData: interaction.options.data});
        } catch (error) {
            // @ts-ignore
            commandLogger.error(new ErrorWithCause(`Error occurred while executing for ${interaction.user.tag}`, {cause: error}), {sendToGuild: true, byDiscordUser: interaction.user.id});
            commandLogger.error('Command Data:', interaction.options.data);
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
        throw new ErrorWithCause(`Failed to register slash commands for guild ${guildId}`, {cause: error});
    }
}

export const initEvents = async (client: BotClient, bot: Bot) => {
    const foldersPath = path.join(__dirname, '../bot/', 'events');
    const eventsFolder = fs.readdirSync(foldersPath);

    const eventsLogger = bot.logger.child({labels: ['Events']}, mergeArr);

    try {
        for (const folder of eventsFolder) {
            const commandsPath = path.join(foldersPath, folder);
            const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
            for (const file of commandFiles) {
                const filePath = path.join(commandsPath, file);
                const event = require(filePath);
                if ('eventType' in event && 'on' in event) {
                    const eventLogger = bot.logger.child({labels: [`Event ${file}`]}, mergeArr);
                    bot.client.on(event.eventType, async (...args) => {
                        try {
                            await event.on(bot, eventLogger, ...args);
                        } catch (e) {
                            // @ts-expect-error
                            eventsLogger.error(new ErrorWithCause(`Error occurred while handling event ${event.eventType} in handler ${file}`, {cause: e}), {sendToGuild: true});
                        }
                    });
                }
            }
        }
    } catch (e) {
        throw e;
    }
}
