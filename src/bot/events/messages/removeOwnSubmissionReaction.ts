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
import {getSubmissionByChannelAndMessageId} from "../../functions/repository.js";
import {Bot} from "../../Bot.js";
import {MTVLogger} from "../../../common/logging.js";
import {ErrorWithCause} from "pony-cause";

module.exports = {
    eventType: Events.MessageReactionAdd,
    on: async (bot: Bot, logger: MTVLogger, ...args: ClientEvents[Events.MessageReactionAdd]) => {
        const msgReact = args[0];
        const reactingUser = args[1];
        if (msgReact.message.inGuild()) {
            if (reactingUser.bot || reactingUser.system) {
                return;
            }
            try {
                const submission = await getSubmissionByChannelAndMessageId(msgReact.message.channelId, msgReact.message.id);
                if (submission !== undefined && submission !== null && submission.active) {
                    const submissionUser = await submission.getUser();
                    if (reactingUser.id === submissionUser.discordId) {
                        const fullUser = await reactingUser.fetch();
                        try {
                            await msgReact.users.remove(fullUser);
                        } catch (e) {
                            throw new ErrorWithCause(`Could not remove own reaction on Submission ${submission.id}`, {cause: e});
                        }
                    }
                }
            } catch (e) {
                throw e;
            }
        }
    }
}
