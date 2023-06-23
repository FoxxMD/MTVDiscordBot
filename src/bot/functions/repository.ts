import {GuildMember, APIInteractionGuildMember, Guild as DiscordGuild} from "discord.js";
import {Sequelize} from "sequelize";
import {User} from "../../common/db/models/user.js";
import {Guild} from "../../common/db/models/Guild.js";
import {Logger} from "@foxxmd/winston";
import {GuildSettings} from "../../common/db/models/GuildSettings.js";

export const getOrInsertUser = async (member: GuildMember | APIInteractionGuildMember, db: Sequelize) => {
    // TODO reduce eager loading
    try {
        let user = await User.findOne({where: {name: member.user.username}, include: {all: true, nested: true}});
        if (user === null) {
            user = await User.create({
                name: member.user.username
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

export const getOrInsertGuild = async (dguild: DiscordGuild, db: Sequelize, logger?: Logger) => {

    try {
        let guild = await Guild.findOne({where: {snowflake: dguild.id}, include: 'settings'});
        if (guild === null) {
            guild = await Guild.create({
                name: dguild.name,
                snowflake: dguild.id
            });
            const defaultChannel = dguild.channels.cache.find(x => x.name.toLowerCase().includes('firehose'));
            if (defaultChannel !== undefined) {
                await guild.upsertSetting(GuildSettings.SUBMISSION_CHANNEL, defaultChannel.id);
            }
            if (logger !== undefined) {
                logger.verbose(`Created Guild ${dguild.name} (${dguild.id}) with ID ${guild.id}`);
            }
        } else {
            if (logger !== undefined) {
                logger.verbose(`Existing Guild ${dguild.name} (${dguild.id}) with ID ${guild.id}`);
            }
        }
        return guild;
    } catch (e) {
        throw e;
    }
}
