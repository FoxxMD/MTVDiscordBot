import {CategoryChannel, Guild as DiscordGuild} from "discord.js";
import {Guild} from "../../common/db/models/Guild.js";
import {GuildSettingDefaults, GuildSettings} from "../../common/db/models/GuildSettings.js";
import {intersect} from "../../utils/index.js";
import {approvedRoleKeywords} from "../../common/infrastructure/Atomic.js";
import {Logger} from "@foxxmd/winston";
import {ROLE_TYPES} from "../../common/db/models/SpecialRole.js";

export const populateGuildDefaults = async (guild: Guild, discGuild: DiscordGuild, logger: Logger) => {
    // init default submission channel
    const defaultChannel = discGuild.channels.cache.find(x => x.name.toLowerCase().includes(GuildSettingDefaults.SUBMISSION_CHANNEL));
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

    // rule reader
    const tosRole = await guild.getRoleIdsByType(ROLE_TYPES.TOS);
    if(approvedRoles.length === 0) {
        const defaultRole = discordRoles.find(x => x.name.toLowerCase() === 'meal enjoyer');
        if(defaultRole !== undefined) {
            await guild.createRole({
                roleType: ROLE_TYPES.TOS,
                discordRoleId: defaultRole.id,
                discordRoleName: defaultRole.name,
            });
        }
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
