import {Guild as DiscordGuild} from "discord.js";
import {Guild} from "../../common/db/models/Guild.js";
import {GuildSettingDefaults, GuildSettings} from "../../common/db/models/GuildSettings.js";

export const populateGuildDefaults = async (guild: Guild, discGuild: DiscordGuild) => {
    const defaultChannel = discGuild.channels.cache.find(x => x.name.toLowerCase().includes(GuildSettingDefaults.SUBMISSION_CHANNEL));
    if (defaultChannel !== undefined) {
        await guild.upsertSetting(GuildSettings.SUBMISSION_CHANNEL, defaultChannel.id);
    }

    await guild.upsertSetting(GuildSettings.MIN_SECONDS, GuildSettingDefaults.MIN_SECONDS);
    await guild.upsertSetting(GuildSettings.MAX_SECONDS, GuildSettingDefaults.MAX_SECONDS);
    await guild.upsertSetting(GuildSettings.RATE_LIMIT_MODE, GuildSettingDefaults.RATE_LIMIT_MODE);
}
