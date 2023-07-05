import {
    InteractionLike,
    MinimalVideoDetails,
    VideoDetails,
    VideoReactions
} from "../../common/infrastructure/Atomic.js";
import {User} from "../../common/db/models/user.js";
import {getOrInsertGuild, getOrInsertVideo} from "./repository.js";
import {VideoSubmission} from "../../common/db/models/videosubmission.js";
import {BotClient} from "../../BotClient.js";
import {
    CacheType,
    ChatInputCommandInteraction,
    Guild as DiscordGuild,
    ModalSubmitInteraction,
    TextChannel
} from "discord.js";
import {GuildSetting} from "../../common/db/models/GuildSetting.js";
import {GuildSettings} from "../../common/db/models/GuildSettings.js";
import {durationToTimestamp, formatNumber, truncateStringToLength} from "../../utils/StringUtils.js";
import dayjs from "dayjs";
import {Guild} from "../../common/db/models/Guild.js";
import {Logger} from "@foxxmd/winston";
import {mergeArr} from "../../utils/index.js";
import {addShowcaseVideo} from "./showcase.js";
import {Video} from "../../common/db/models/video.js";

export const addFirehoseVideo = async (interaction: InteractionLike, video: MinimalVideoDetails, user: User) => {

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

        await submissionMessage.react(VideoReactions.UP);
        await submissionMessage.react(VideoReactions.DOWN);
        await submissionMessage.react(VideoReactions.REPORT);

        await VideoSubmission.create({
            messageId: submissionMessage.id,
            guildId: interaction.guild.id,
            channelId: submissionMessage.channelId,
            videoId: videoEntity.id,
            userId: user.id,
            upvotes: 0,
            downvotes: 0,
            active: true
        });

        await interaction.reply({content: `Video Submitted! ${submissionMessage.url}`, ephemeral: true});
    } catch (e) {
        throw e;
    }
}

export const processFirehoseVideos = async (dguild: DiscordGuild, parentLogger: Logger) => {

    const logger = parentLogger.child({labels: ['Firehose']}, mergeArr);

    const guild = await getOrInsertGuild(dguild);

    const activeSubmissions = await VideoSubmission.findAll({
        where: {
            guildId: guild.id,
            active: true
        },
        include: [
            {
                model: User,
                as: 'user'
            },
            {
                model: Video,
                as: 'video'
            }
        ]
    });

    logger.verbose(`Found ${activeSubmissions.length} active Video Submissions`);

    if (activeSubmissions.length > 0) {
        for (const asub of activeSubmissions) {
            const channel = await dguild.channels.fetch(asub.channelId) as TextChannel;
            const message = await channel.messages.fetch(asub.messageId);

            if(message === undefined) {
                logger.warn(`No message with ID ${asub.messageId} exists for Video Submission ${asub.id} => ${truncateStringToLength(30)((await asub.getVideo()).title)} -- assuming it was deleted! Removing Submission`);
                await asub.destroy();
                continue;
            }

            const up = message.reactions.resolve(VideoReactions.UP);
            const down = message.reactions.resolve(VideoReactions.DOWN);
            const report = message.reactions.resolve(VideoReactions.REPORT);

            // decrease by one to remove bot react
            asub.upvotes = up.count - 1;
            asub.downvotes = down.count - 1;
            // TODO report

            await asub.save();

            // process if 24 hours has passed
            if (dayjs(asub.createdAt).add(24, 'hours').isBefore(dayjs())) {
                // naive
                const total = asub.upvotes + asub.downvotes;
                const percent = (asub.upvotes / total) * 100;
                const statusParts: string[] = [
                    `Submission ${asub.id} => ${truncateStringToLength(30)((await asub.getVideo()).title)} => Upvotes ${asub.upvotes} of ${total} (${formatNumber(percent)}%)`
                ];
                if (percent > 50) {
                    statusParts.push('=> WILL SHOWCASE');
                    logger.verbose(statusParts.join(''));
                    try {
                        await addShowcaseVideo(dguild, asub, logger);
                    } catch (e) {
                        // keep moving
                    }
                } else {
                    statusParts.push('=> Failed to Showcase');
                    logger.verbose(statusParts.join(''));
                    asub.active = false;
                    await asub.save();
                }

            }
        }
    }
}
