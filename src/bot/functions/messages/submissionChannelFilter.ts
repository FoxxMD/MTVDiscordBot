import {
    channelMention,
    ChannelType, ClientEvents,
    Events,
    GuildTextBasedChannel,
    Message,
    TextChannel,
    ThreadChannel,
    userMention,
    ThreadAutoArchiveDuration
} from "discord.js";
import {doubleReturnNewline, getUrlsFromString, parseUrl} from "../../../utils/StringUtils.js";
import {Bot} from "../../Bot.js";
import {MTVLogger} from "../../../common/logging.js";
import {GuildSettings} from "../../../common/db/models/GuildSettings.js";

export const process = async (bot: Bot, logger: MTVLogger, ...args: ClientEvents[Events.MessageCreate]): Promise<boolean> => {
    const message = args[0];

    const guild = bot.guilds.find(x => x.id === message.guildId);
    if(guild === undefined) {
        return false;
    }
    const submissionChannel = await guild.getSettingValue<string>(GuildSettings.SUBMISSION_CHANNEL);
    if (submissionChannel === undefined) {
        return false;
    }
    if (submissionChannel !== message.channelId) {
        return false;
    }

    const channel = message.channel as TextChannel;
    const userId = message.member.user.id;
    const content = message.cleanContent;
    await message.delete();

    const thread = await channel.threads.create({
        type: ChannelType.PrivateThread,
        name: `Use /submit command - ${message.id}`,
        reason: 'Enforce slash command usage',
        autoArchiveDuration: ThreadAutoArchiveDuration.OneHour
    });
    await thread.members.add(userId);
    await thread.send({
        content: doubleReturnNewline
            `
                            Hello, ${userMention(userId)}, your message in ${channelMention(channel.id)} has been removed:\n
                            \`\`\`\n
                            ${content}\n
                            \`\`\`\n
                            **General chat in ${channelMention(channel.id)} is not allowed.**\n\n
                            However, you may use the \`/submit\` command in ${channelMention(channel.id)} in order to **submit videos.**\n\n
                            If you feel this action was erroneous mention moderators here with \`@Moderation Team\`.
                            `
    });
    return true;
};
