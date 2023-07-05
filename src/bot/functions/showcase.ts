import {InteractionLike, MinimalVideoDetails, VideoDetails} from "../../common/infrastructure/Atomic.js";
import {User} from "../../common/db/models/user.js";
import {getOrInsertVideo} from "./repository.js";
import {VideoSubmission} from "../../common/db/models/videosubmission.js";
import {BotClient} from "../../BotClient.js";
import {
    CacheType,
    CategoryChannel,
    ChatInputCommandInteraction,
    Guild,
    ModalSubmitInteraction,
    TextChannel,
    userMention
} from "discord.js";
import {GuildSetting} from "../../common/db/models/GuildSetting.js";
import {GuildSettings} from "../../common/db/models/GuildSettings.js";
import {durationToTimestamp, formatNumber} from "../../utils/StringUtils.js";
import dayjs from "dayjs";
import {Logger} from "@foxxmd/winston";
import {getShowcaseChannelFromCategory} from "./guildUtil.js";
import {commaListsAnd} from "common-tags";
import {ShowcasePost} from "../../common/db/models/ShowcasePost.js";

export const addShowcaseVideo = async (dguild: Guild, videoSubmission: VideoSubmission, logger: Logger) => {

    const existing = await videoSubmission.getShowcase();
    if (existing) {
        logger.warn(`Tried to add showcase video for Submission (${videoSubmission.id}) that already has a showcase! Marking submission as inactive and skipping.`);
        videoSubmission.active = false;
        await videoSubmission.save();
        return;
    }

    const guild = await videoSubmission.getGuild();
    const video = await videoSubmission.getVideo();
    const submitter = await videoSubmission.getUser();

    let catId: string;
    if (await videoSubmission.isOC()) {
        const ocVal = await guild.getSettingValue<string>(GuildSettings.CATEGORY_OC);
        if (ocVal === undefined) {
            logger.warn(`Cannot post OC showcase because no OC Category is set!`);
            return;
        }
        catId = ocVal;
    } else {
        const showcaseVal = await guild.getSettingValue<string>(GuildSettings.CATEGORY_SHOWCASE);
        if (showcaseVal === undefined) {
            logger.warn(`Cannot post Showcase video because no Showcase Category is set!`);
            return;
        }
        catId = showcaseVal;
    }

    const category = dguild.channels.resolve(catId) as CategoryChannel | undefined;
    if (category === undefined) {
        logger.warn(`Cannot post video because given Category Channel ID ${catId} does not correspond to an existing channel!`);
        return;
    }

    const channel = await getShowcaseChannelFromCategory(category, video.length) as TextChannel;
    if (channel === undefined) {
        logger.warn(`Cannot post video because given Category '${category.name}' does not contain a Channel with name syntax 'X-X' that matches video duration of ${formatNumber(video.length / 60)} minutes`);
        return;
    }

    try {
        const title = `**${video.title}** [${durationToTimestamp(dayjs.duration({seconds: video.length}))}]`;
        const detailParts: string[] = [];
        const creator = await video.getCreator();
        if (creator !== undefined) {
            let creatorStr = `Creator: _${creator.name}_`;
            const creatorUsers = await creator.getUsers();
            if (creatorUsers.length > 0) {
                creatorStr = `${creatorStr} (${commaListsAnd`${creatorUsers.map(x => userMention(x.discordId))}`})`;
            }
            detailParts.push(creatorStr);
        }

        detailParts.push(`Submitted By: ${userMention(submitter.discordId)} here ${videoSubmission.getDiscordMessageLink()}`)
        detailParts.push(`Link: ${video.url}`);

        const submissionMessage = await channel.send(`${title}\n${detailParts.map(x => `* ${x}`).join('\n')}`);

        await submissionMessage.startThread({name: video.title});

        const post = await ShowcasePost.create({
            messageId: submissionMessage.id,
            guildId: dguild.id,
            channelId: submissionMessage.channelId,
            videoId: video.id,
            userId: submitter.id,
        });

        logger.info(`Created Showcase Post ${post} from Video Submission ${videoSubmission.id} in ${category.name} -> ${channel.name}: ${video.title}`);

        videoSubmission.active = false;
        await videoSubmission.save();
    } catch (e) {
        throw e;
    }
}
