import {GuildMember, APIInteractionGuildMember, Guild as DiscordGuild} from "discord.js";
import {Sequelize, Op} from "sequelize";
import {User} from "../../common/db/models/user.js";
import {Guild} from "../../common/db/models/Guild.js";
import {Logger} from "@foxxmd/winston";
import {GuildSettings} from "../../common/db/models/GuildSettings.js";
import {VideoSubmission} from "../../common/db/models/videosubmission.js";
import {Video} from "../../common/db/models/video.js";
import {CreatorDetails, MinimalVideoDetails} from "../../common/infrastructure/Atomic.js";
import {SimpleError} from "../../utils/Errors.js";
import {Creator} from "../../common/db/models/creator.js";
import {populateGuildDefaults} from "./guildUtil.js";

export const getOrInsertUser = async (member: GuildMember | APIInteractionGuildMember, dguild: DiscordGuild) => {
    // TODO reduce eager loading
    try {
        let user = await User.findOne({
            where: {name: member.user.username, guildId: dguild.id},
            //include: {all: true, nested: true}
        });
        if (user === null) {
            const guild = await getOrInsertGuild(dguild);
            user = await User.create({
                name: member.user.username,
                guildId: guild.id,
                discordId: member.user.id,
            });
            await user.createTrustLevel({
                trustLevelId: 1
            });
        }
        return user;
    } catch (e) {
        throw e;
    }
}

export const getOrInsertGuild = async (dguild: DiscordGuild, logger?: Logger) => {

    try {
        let guild = await Guild.findOne({where: {id: dguild.id}, include: 'settings'});
        if (guild === null) {
            guild = await Guild.create({
                name: dguild.name,
                id: dguild.id
            });
            if (logger !== undefined) {
                logger.verbose(`Created Guild ${dguild.name} (${dguild.id}) with ID ${guild.id}`);
            }
            await populateGuildDefaults(guild, dguild, logger);
        }
        return guild;
    } catch (e) {
        throw e;
    }
}

export const getUserLastSubmittedVideo = async (user: User) => {
    const res = await VideoSubmission.findAll({where: {userId: user.id}, order: [['id', 'DESC']], limit: 3});
    if (res.length > 0) {
        return res[0];
    }
    return undefined;
}

export const getVideoByVideoId = async (id: string, platform: string) => {
    const vid = await Video.findOne({where: {platformId: id, platform}, include: 'creator'});
    if (vid === null) {
        return undefined;
    }
    return vid;
}

export const getActiveSubmissions = async (guild: Guild) => {
    return await VideoSubmission.findAll({
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
}

export const getOrInsertVideo = async (details: MinimalVideoDetails) => {
    const existing = await getVideoByVideoId(details.id, details.platform);
    if (existing !== undefined) {
        return existing;
    }
    const vid = await Video.create({
        platform: details.platform,
        platformId: details.id,
        title: details.title,
        url: details.url.toString(),
        length: details.duration,
        nsfw: details.nsfw ?? false
    });
    if (details.creator !== undefined) {
        const creator = await upsertVideoCreator(details.platform, details.creator);
        await vid.setCreator(creator);
    }
    return vid;
}

export const upsertVideoCreator = async (platform: string, details: CreatorDetails) => {
    const {id: platformId, name} = details;

    const creator = await getCreatorByDetails(platform, details);

    let creatorEntity: Creator = creator !== undefined ? creator : undefined;
    // naive
    if(creatorEntity !== undefined) {
        // if (creatorEntity.name !== name) {
        //     creatorEntity.name = name;
        //     await creatorEntity.save();
        // }
        return creatorEntity;
    }

    creatorEntity = await Creator.create({
        platform,
        platformId,
        name,
        nsfw: false
    });
    return creatorEntity;
}

export const getCreatorByDetails = async (platform: string, details: CreatorDetails) => {
    const {id: platformId, name} = details;
    if (platformId === undefined && name === undefined) {
        throw new SimpleError('Must provide either platformId or name');
    }
    const criteria = [];
    if (platformId !== undefined) {
        criteria.push({platformId});
    }
    if (name !== undefined) {
        criteria.push({name})
    }
    const creators = await Creator.findAll({
        where: {
            platform,
            [Op.or]: criteria
        }
    });
    if (creators.length > 0) {
        return creators[0];
    }
    return undefined;
}
