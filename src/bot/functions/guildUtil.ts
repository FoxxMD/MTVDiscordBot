import {CategoryChannel, Guild as DiscordGuild} from "discord.js";
import {Guild} from "../../common/db/models/Guild.js";
import {GuildSettingDefaults, GuildSettings} from "../../common/db/models/GuildSettings.js";
import {intersect} from "../../utils/index.js";
import {approvedRoleKeywords} from "../../common/infrastructure/Atomic.js";
import {Logger} from "@foxxmd/winston";
import {ROLE_TYPES} from "../../common/db/models/SpecialRole.js";
import {SimpleError} from "../../utils/Errors.js";

export const populateGuildDefaults = async (guild: Guild, discGuild: DiscordGuild, logger: Logger) => {

    const channels =  await discGuild.channels.fetch();

    // init default submission channel
    const defaultChannel = channels.find(x => x.name.toLowerCase().includes(GuildSettingDefaults.SUBMISSION_CHANNEL));
    if (defaultChannel !== undefined) {
        await guild.upsertSetting(GuildSettings.SUBMISSION_CHANNEL, defaultChannel.id);
    }

    // init default roles
    const discordRoles = await discGuild.roles.fetch();

    // approved
    const approvedRoles = await guild.getRoleIdsByType(ROLE_TYPES.APPROVED);
    if(approvedRoles.length === 0) {
        const defaultApprovedRole = discordRoles.find(x => approvedRoleKeywords.some(y => x.name.toLowerCase().includes(y)));
        if(defaultApprovedRole !== undefined) {
            await guild.createRole({
                roleType: ROLE_TYPES.APPROVED,
                discordRoleId: defaultApprovedRole.id,
                discordRoleName: defaultApprovedRole.name,
            });
        }
    }

    // content creator
    const ccRole = await guild.getRoleIdsByType(ROLE_TYPES.CONTENT_CREATOR);
    if(ccRole.length === 0) {
        const defaultCCRole = discordRoles.find(x => x.name.toLowerCase() === 'content creator');
        if(defaultCCRole !== undefined) {
            await guild.createRole({
                roleType: ROLE_TYPES.CONTENT_CREATOR,
                discordRoleId: defaultCCRole.id,
                discordRoleName: defaultCCRole.name,
            });
        }
    }

    // default categories
    const showcaseCat = channels.find(x => x instanceof CategoryChannel && x.name.toLowerCase().includes('videos [x-x'));
    if(showcaseCat !== undefined) {
        await guild.upsertSetting(GuildSettings.CATEGORY_SHOWCASE, showcaseCat.id);
    }

    const ocCat = channels.find(x => x instanceof CategoryChannel && x.name.toLowerCase().includes('original content [x-x'));
    if(ocCat !== undefined) {
        await guild.upsertSetting(GuildSettings.CATEGORY_OC, ocCat.id);
    }


    await guild.upsertSetting(GuildSettings.MIN_SECONDS, GuildSettingDefaults.MIN_SECONDS);
    await guild.upsertSetting(GuildSettings.MAX_SECONDS, GuildSettingDefaults.MAX_SECONDS);
    await guild.upsertSetting(GuildSettings.RATE_LIMIT_MODE, GuildSettingDefaults.RATE_LIMIT_MODE);
}

export const getShowcaseChannelFromCategory = async (cat: CategoryChannel, duration: number) => {
    const minutes = duration / 60;

    return cat.children.cache.find(x => {
        const [lowerRangeVal, upperRangeVal] = x.name.split('-');
        const upperRangeNum = Number.parseInt(upperRangeVal);
        const lowerRangeNum = Number.parseInt(lowerRangeVal);
        if (Number.isNaN(upperRangeNum) && lowerRangeNum === 60 && minutes > 60) {
            return x;
        } else if (minutes > lowerRangeNum && minutes <= upperRangeNum) {
            return x;
        }
    });
}

export const getContentCreatorRole = async (guild: Guild) => {
    const ccRoles = await guild.getRolesByType(ROLE_TYPES.CONTENT_CREATOR);
    if(ccRoles.length === 0) {
        throw new SimpleError('No Discord role is associated with the Content Creator role type');
    }
    return ccRoles[0];
}

export const getContentCreatorDiscordRole = async (guild: Guild, dguild: DiscordGuild) => {
    const specialRole = await getContentCreatorRole(guild);
    const ccRole = await dguild.roles.fetch(specialRole.discordRoleId);
    if(ccRole === undefined) {
        throw new SimpleError(`Content Creator role type references a Discord Role ID ${specialRole.discordRoleId} that does not exist`);
    }
    return ccRole;
}
