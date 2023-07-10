import {
    InteractionLike,
    MinimalVideoDetails,
    VideoDetails,
    VideoReactions
} from "../../common/infrastructure/Atomic.js";
import {User} from "../../common/db/models/user.js";
import {getActiveSubmissions, getOrInsertGuild, getOrInsertVideo} from "./repository.js";
import {VideoSubmission} from "../../common/db/models/videosubmission.js";
import {BotClient} from "../../BotClient.js";
import {
    CacheType,
    ChatInputCommandInteraction,
    Guild as DiscordGuild, Message,
    ModalSubmitInteraction,
    TextChannel, userMention,
    time,
} from "discord.js";
import {GuildSetting} from "../../common/db/models/GuildSetting.js";
import {GuildSettings} from "../../common/db/models/GuildSettings.js";
import {
    durationToTimestamp,
    formatNumber,
    parseRegexSingleOrFail,
    truncateStringToLength
} from "../../utils/StringUtils.js";
import dayjs from "dayjs";
import {Guild} from "../../common/db/models/Guild.js";
import {Logger} from "@foxxmd/winston";
import {mergeArr} from "../../utils/index.js";
import {addShowcaseVideo} from "./showcase.js";
import {ErrorWithCause} from "pony-cause";
import {commaListsAnd} from "common-tags";
import {REGEX_VOTING_ACTIVE} from "../../common/infrastructure/Regex.js";
import {ROLE_TYPES} from "../../common/db/models/SpecialRole.js";

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
            let creatorStr = `Creator: _${creator.name}_`;
            const creatorUsers = await creator.getUsers();
            if (creatorUsers.length > 0) {
                creatorStr = `${creatorStr} (${commaListsAnd`${creatorUsers.map(x => userMention(x.discordId))}`})`;
            }
            detailParts.push(creatorStr);
        }
        detailParts.push(`Submitted By: <@${interaction.user.id}>`)
        detailParts.push(`Link: ${videoEntity.url}`);
        detailParts.push(`Voting Active: **Yes** (Until ${time(dayjs().add(24, 'hours').toDate())})`)

        const submissionMessage = await channel.send(`${title}\n${detailParts.map(x => `* ${x}`).join('\n')}`);

        await interaction.reply({content: `Video Submitted! ${submissionMessage.url}`, ephemeral: true});

        await submissionMessage.react(VideoReactions.UP);
        await submissionMessage.react(VideoReactions.DOWN);
        await submissionMessage.react(VideoReactions.REPORT);

        await submissionMessage.startThread({name: video.title});

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
    } catch (e) {
        throw e;
    }
}

export const processFirehoseVideos = async (dguild: DiscordGuild, parentLogger: Logger) => {

    const flogger = parentLogger.child({labels: ['Firehose']}, mergeArr);

    const guild = await getOrInsertGuild(dguild);
    const approvedRoles = await guild.getRoleIdsByType(ROLE_TYPES.APPROVED);
    const janitorRoles = await guild.getRoleIdsByType(ROLE_TYPES.JANITOR);
    const trustedRoles = approvedRoles.concat(janitorRoles);

    const safetyChannelId = await guild.getSettingValue<string>(GuildSettings.SAFETY_CHANNEL);
    let safetyChannel: TextChannel | undefined;
    if (safetyChannelId !== undefined) {
        try {
            safetyChannel = await dguild.channels.fetch(safetyChannelId) as TextChannel;
        } catch (e) {
            flogger.warn(`No safety channel set or could not get channel with ID ${safetyChannelId}`);
        }
    }

    const activeSubmissions = await getActiveSubmissions(guild);

    const ownId = dguild.client.user.id;

    if (activeSubmissions.length > 0) {
        for (const asub of activeSubmissions) {

            const logger = flogger.child({labels: [`Sub ${asub.id}`]});

            const submitter = await asub.getUser();

            const channel = await dguild.channels.fetch(asub.channelId) as TextChannel;
            let message: Message;
            try {
                message = await channel.messages.fetch(asub.messageId);
            } catch (e) {
                if(e.code === 10008) {
                    logger.warn(`No message with ID ${asub.messageId} exists for => ${truncateStringToLength(30)((await asub.getVideo()).title)} -- assuming it was deleted! Removing Submission`);
                    await asub.destroy();
                } else {
                    logger.warn(new ErrorWithCause(`An error preventing fetching Discord Message`, {cause: e}));
                }
                continue;
            }

            const up = message.reactions.resolve(VideoReactions.UP);
            const upUsers = await up.users.fetch();

            const down = message.reactions.resolve(VideoReactions.DOWN);
            const downUsers = await down.users.fetch();

            const report = message.reactions.resolve(VideoReactions.REPORT);
            const reportUsers = await report.users.fetch();

            // ignore bot and submitter reacts
            asub.upvotes = upUsers.filter((user, key) => {
                return key !== ownId && key !== submitter.discordId;
            }).size;
            asub.downvotes = downUsers.filter((user, key) => {
                return key !== ownId && key !== submitter.discordId;
            }).size;
            asub.reports = reportUsers.filter((user, key) => {
                return key !== ownId && key !== submitter.discordId;
            }).size;
            let trustedReports = 0;
            for(const [userId, clientUser] of reportUsers) {
                if(userId === ownId || userId === submitter.discordId) {
                    continue;
                }
                const guildUser = await dguild.members.fetch(userId);
                const hasTrusted = trustedRoles.some(x => guildUser.roles.resolve(x));
                if(hasTrusted) {
                    trustedReports++;
                }
            }
            asub.reportsTrusted = trustedReports;

            await asub.save();

            if(asub.reportsTrusted > 4 || asub.reports > 9 || (asub.reportsTrusted > 3 && asub.reports > 7)) {
                let msg = await asub.toChannelSummary({showVoting: false});
                msg = `Removed via automated reporting\n* CreatedAt: ${time(asub.createdAt)}\n* Reports: ${asub.reports}\n* Trusted Reports: ${asub.reportsTrusted}\n\n${msg}`;
                flogger.warn(msg);
                if(safetyChannel !== undefined) {
                    await safetyChannel.send({content: msg, flags: 4});
                }
                asub.active = false;
                asub.messageId = undefined;
                await message.delete();
                await asub.save();
                continue;
            }

            // process if 24 hours has passed
            if (dayjs(asub.createdAt).add(24, 'hours').isBefore(dayjs())) {
                // naive
                const total = asub.upvotes + asub.downvotes;
                const percent = (asub.upvotes / total) * 100;
                const statusParts: string[] = [
                    `${truncateStringToLength(30)((await asub.getVideo()).title)} => Upvotes ${asub.upvotes} of ${total} (${formatNumber(percent)}%)`
                ];
                if (percent > 50) {
                    statusParts.push('=> WILL SHOWCASE');
                    logger.info(statusParts.join(''));
                    try {
                        const video = await asub.getVideo();
                        await addShowcaseVideo(dguild, video, logger, {videoSubmission: asub});
                    } catch (e) {
                        // keep moving
                    }
                } else {
                    statusParts.push('=> Failed to Showcase');
                    logger.info(statusParts.join(''));
                    asub.active = false;
                    await asub.save();
                }
                const body = message.content;
                const activeStr = parseRegexSingleOrFail(REGEX_VOTING_ACTIVE, body);
                if(activeStr !== undefined && activeStr.named.status === 'Yes') {
                    const edited = body.replace(REGEX_VOTING_ACTIVE, 'Voting Active: **No**');
                    await message.edit({content: edited});
                }
            }
        }
    } else {
        flogger.debug(`No active Video Submissions`);
    }
}
