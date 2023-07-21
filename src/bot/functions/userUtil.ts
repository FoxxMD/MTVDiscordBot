import {User} from "../../common/db/models/user.js";
import {GuildMemberRoleManager} from "discord.js";
import dayjs, {Dayjs} from "dayjs";
import {MessageLike, SpecialRoleType} from "../../common/infrastructure/Atomic.js";
import {getOrInsertGuild} from "./repository.js";
import {intersect} from "../../utils/index.js";
import {ROLE_TYPES} from "../../common/db/models/SpecialRole.js";

export const memberHasRoleType = async (roleType: SpecialRoleType, interaction: MessageLike) => {
    const guild = await getOrInsertGuild(interaction.guild);
    const roles = (interaction.member.roles as GuildMemberRoleManager).cache.map(x => x.id);

    const specialRoles = await guild.getRoleIdsByType(roleType);

    return (intersect(roles, specialRoles)).length > 0;
}

export const checkAge = async (interaction: MessageLike, user: User): Promise<Dayjs | undefined> => {
    const hasAllowedRole = await memberHasRoleType(ROLE_TYPES.APPROVED, interaction);
    if(hasAllowedRole) {
        return;
    }
    let joined: Dayjs;
    if('joinedAt' in interaction.member) {
        joined = dayjs(interaction.member.joinedAt);
    } else {
        joined = dayjs(user.createdAt);
    }
    const waitingPeriodOver = joined.add(24, 'hours');

    if(waitingPeriodOver.isAfter(dayjs())) {
        return waitingPeriodOver;
    }
    return undefined;
}

export const checkBlacklisted = async (interaction: MessageLike, user: User) => {
    const activeModifier = await user.getActiveModifier();
    if(activeModifier === undefined || activeModifier.flag === 'allow') {
        return false;
    }
    return true;
}
