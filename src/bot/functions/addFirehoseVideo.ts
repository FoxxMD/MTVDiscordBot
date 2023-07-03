import {MinimalVideoDetails, VideoDetails} from "../../common/infrastructure/Atomic.js";
import {User} from "../../common/db/models/user.js";
import {getOrInsertVideo} from "./repository.js";
import {VideoSubmission} from "../../common/db/models/videosubmission.js";
import {BotClient} from "../../BotClient.js";
import {CacheType, ChatInputCommandInteraction, ModalSubmitInteraction, TextChannel} from "discord.js";
import {GuildSetting} from "../../common/db/models/GuildSetting.js";
import {GuildSettings} from "../../common/db/models/GuildSettings.js";
import {durationToTimestamp} from "../../utils/StringUtils.js";
import dayjs from "dayjs";

export const addFirehoseVideo = async (interaction: ChatInputCommandInteraction<CacheType> | ModalSubmitInteraction<CacheType>, video: MinimalVideoDetails, user: User) => {

    const firehoseChannel = await GuildSetting.findOne({
        where: {
            guildId: interaction.guild.id,
            name: GuildSettings.SUBMISSION_CHANNEL
        }
    });

    if (firehoseChannel === null) {
        return await interaction.reply({
            content: 'Moderators of this server have not yet set the submission channel! Please contact them to get this set.',
            ephemeral: true
        });
    }

    try {
        const videoEntity = await getOrInsertVideo(video);

        const channel = interaction.client.channels.cache.get(firehoseChannel.valueCast<string>()) as TextChannel;
        const title = `**${video.title}** [${durationToTimestamp(dayjs.duration({seconds: videoEntity.length}))}]`;
        const detailParts: string[] = [];
        const creator = await videoEntity.getCreator();
        if (creator !== undefined) {
            detailParts.push(`Creator: _${creator.name}_`);
        }
        detailParts.push(`Submitted By: <@${interaction.user.id}>`)
        detailParts.push(`Link: ${videoEntity.url}`);

        const submissionMessage = await channel.send(`${title}\n${detailParts.map(x => `* ${x}`).join('\n')}`);

        await submissionMessage.react('👍');
        await submissionMessage.react('👎');
        await submissionMessage.react('❌');

        await VideoSubmission.create({
            messageId: submissionMessage.id,
            guildId: interaction.guild.id,
            channelId: submissionMessage.channelId,
            videoId: videoEntity.id,
            userId: user.id,
            upvotes: 0,
            downvotes: 0,
        });

        await interaction.reply({content: `Video Submitted! ${submissionMessage.url}`, ephemeral: true});
    } catch (e) {
        throw e;
    }
}

// https://discord.com/channels/1082721650572796085/1121819515429335171/1125501387938209823
