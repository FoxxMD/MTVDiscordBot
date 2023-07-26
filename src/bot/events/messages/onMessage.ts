import {
    channelMention,
    ChannelType, ClientEvents,
    Events,
    GuildTextBasedChannel,
    Message,
    TextChannel,
    ThreadChannel,
    userMention
} from "discord.js";
import {Bot} from "../../Bot.js";
import {MTVLogger} from "../../../common/logging.js";
import {process as videoLinkProcess} from '../../functions/messages/videoLinkfilter.js';
import {process as submissionChannelProcess} from '../../functions/messages/submissionChannelFilter.js';

module.exports = {
    eventType: Events.MessageCreate,
    on: async (bot: Bot, logger: MTVLogger, ...args: ClientEvents[Events.MessageCreate]) => {

        const message = args[0];

        if (!message.inGuild() || message.system) {
            return;
        }
        if (message.author !== undefined && (message.author.bot || message.author.system)) {
            return;
        }
        if (message.member === undefined) {
            return;
        }
        if (message.member.user.bot || message.system || !message.deletable) {
            return;
        }
        // makes it easier to debug
        if (!message.member.moderatable) {
            return;
        }

        if (message.channel.isThread()) {
            const thread = message.channel as ThreadChannel;
            // TODO may want to do this only if also created by MTV Bot?
            if (thread.type === ChannelType.PrivateThread) {
                // only mods and bots can make private channels
                // so for now assume this is a controlled space we shouldn't moderate automatically
                return;
            }
        }

        if (!bot.shouldInteract(message.guildId)) {
            return;
        }

        if((await submissionChannelProcess(bot, logger, ...args)) === true) {
            return;
        }
        await videoLinkProcess(bot, logger, ...args);
    }
}
