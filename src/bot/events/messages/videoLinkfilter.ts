import {channelMention, ChannelType, Events, Message, TextChannel, ThreadChannel, userMention} from "discord.js";
import * as linkify from 'linkifyjs';
import {getUrlsFromString, parseUrl} from "../../../utils/StringUtils.js";
import {urlParser} from "../../../common/contentPlatforms/UrlParser.js";
import {VideoInfo} from "js-video-url-parser/lib/urlParser.js";
import {getOrInsertUser} from "../../functions/repository.js";
import {checkAge, checkBlacklisted, memberHasRoleType} from "../../functions/userUtil.js";
import {Logger} from "@foxxmd/winston";
import {oneLine} from "common-tags";
import {ROLE_TYPES} from "../../../common/db/models/SpecialRole.js";
import {PlatformManager} from "../../../common/contentPlatforms/PlatformManager.js";
import {Bot} from "../../Bot.js";
import {MTVLogger} from "../../../common/logging.js";

module.exports = {
    eventType: Events.MessageCreate,
    on: async (bot: Bot, logger: MTVLogger, message: Message<boolean>) => {
        if (message.inGuild()) {
            if (message.system) {
                return;
            }
            if (message.author !== undefined && (message.author.bot || message.author.system)) {
                return;
            }

            if (message.member === undefined || message.member.user.bot || message.system || !message.member.moderatable || !message.deletable) {
                return;
            }
            if(!bot.shouldInteract(message.guildId)) {
                return;
            }

            if (message.channel.isThread) {
                const thread = message.channel as ThreadChannel;
                // TODO may want to do this only if also created by MTV Bot?
                if (thread.type === ChannelType.PrivateThread) {
                    // only mods and bots can make private channels
                    // so for now assume this is a controlled space we shouldn't moderate automatically
                    return;
                }
            }
            // check for links in text content
            let foundLinks = getUrlsFromString(message.content);

            let foundVideoLinks: VideoInfo[] = [];

            for (const embed of message.embeds) {
                if (embed.url !== undefined) {
                    foundLinks.push(embed.url);
                }
                if (linkify.test(embed.title)) {
                    foundLinks.push(embed.title);
                }
                if (embed.author !== undefined && embed.author.url !== undefined) {
                    foundLinks.push(embed.author.url);
                }
                if (embed.video !== undefined && embed.video.url !== undefined) {
                    foundLinks.push(embed.video.url);
                }
                const embedLinks = getUrlsFromString(embed.description);
                foundLinks = foundLinks.concat(embedLinks);
                for (const field of embed.fields) {
                    foundLinks = foundLinks.concat(getUrlsFromString(field.name));
                    foundLinks = foundLinks.concat(getUrlsFromString(field.value));
                }
            }

            for (const urlVal of foundLinks) {
                const normalUrl = parseUrl(urlVal);
                const urlDetails = urlParser.parse(normalUrl.toString());
                if (urlDetails !== undefined) {
                    foundVideoLinks.push(urlDetails);
                }
            }

            if (foundVideoLinks.length > 0) {
                const user = await getOrInsertUser(message.member, message.guild);

                const isBlacklisted = await checkBlacklisted(message, user);
                if (isBlacklisted) {
                    const content = message.cleanContent;

                    const msg = oneLine
                        `Blacklisted user ${userMention(message.member.user.id)} tried to post video link \`${urlParser.create({videoInfo: foundVideoLinks[0]})}\`
                        ${foundVideoLinks.length > 1 ? ` and ${foundVideoLinks.length - 1} others` : ''}
                        in ${channelMention(message.channelId)}:\n\n
                        \`\`\`\n
                        ${content}
                        \`\`\`
                        `;
                    logger.safety(msg, {sendToGuild: true, discordGuild: message.guildId});

                    await message.delete();

                    const thread = await (message.channel as TextChannel).threads.create({
                        type: ChannelType.PrivateThread,
                        name: 'jailed',
                        reason: 'Moderation thread',
                        autoArchiveDuration: 60
                    });
                    await thread.members.add(message.member.user.id);
                    await thread.send({
                        content: oneLine
                            `Your message has been removed:\n\n
                            \`\`\`\n
                            ${message.cleanContent}
                            \`\`\`\n
                            You are currently in jail and cannot submit videos. This **also means you cannot (and should not) be posting videos in chat channels.**\n\n
                        If you feel this action was erroneous mention moderators here with \`@Moderation Team\`.`
                    });
                    return;
                }

                const hasAllowedRole = await memberHasRoleType(ROLE_TYPES.APPROVED, message);
                if (!hasAllowedRole) {

                    const ageCheck = await checkAge(message, user);
                    if (ageCheck !== undefined) {
                        const content = message.cleanContent;

                        const msg = oneLine
                            `User ${userMention(message.member.user.id)} in 24 hour probation tried to post video link \`${urlParser.create({videoInfo: foundVideoLinks[0]})}\`
                        ${foundVideoLinks.length > 1 ? ` and ${foundVideoLinks.length - 1} others` : ''}
                        in ${channelMention(message.channelId)}:\n\n
                        \`\`\`\n
                        ${content}
                        \`\`\`
                        `;
                        logger.safety(msg, {sendToGuild: true, discordGuild: message.guildId});

                        await message.delete();

                        const thread = await (message.channel as TextChannel).threads.create({
                            type: ChannelType.PrivateThread,
                            name: 'Posting links in 24 hour probation period',
                            reason: 'Moderation thread',
                            autoArchiveDuration: 60
                        });
                        await thread.members.add(message.member.user.id);
                        await thread.send({
                            content: oneLine
                                `Your message has been removed:\n\n
                            \`\`\`\n
                            ${content}
                            \`\`\`\n
                            During the 24 hour period after you have joined the server you are not allowed to submit videos OR post video links in chat.
                        This policy is in place to prevent spam. Continued attempts may result in a ban. Please respect our community!\n\n
                        If you feel this action was erroneous mention moderators here with \`@Moderation Team\`.`
                        });

                        return;
                    }

                    const manager = new PlatformManager(bot.config.credentials, logger);
                    for (const info of foundVideoLinks) {
                        const [deets, urlDetails, existingVideo, creator] = await manager.getVideoDetails(urlParser.create({videoInfo: info}), true);
                        if (creator !== undefined) {
                            const modifier = await creator.getActiveModifier();
                            if (modifier !== undefined && modifier.flag === 'deny') {
                                const content = message.cleanContent;

                                const msg = oneLine
                                    `User ${userMention(message.member.user.id)} tried to post video link \`${urlParser.create({videoInfo: info})}\`
                                    from blacklisted Creator ${creator.name}
                                    in ${channelMention(message.channelId)}:\n\n
                                    \`\`\`\n
                                    ${content}
                                    \`\`\`
                                    `;
                                logger.safety(msg, {sendToGuild: true, discordGuild: message.guildId});

                                await message.delete();

                                const thread = await (message.channel as TextChannel).threads.create({
                                    type: ChannelType.PrivateThread,
                                    name: 'jailed-creator',
                                    reason: 'Moderation thread',
                                    autoArchiveDuration: 60
                                });
                                await thread.members.add(message.member.user.id);

                                await thread.send({
                                    content: oneLine
                                        `Your message has been removed:\n\n
                            \`\`\`\n
                            ${content}
                            \`\`\`\n
                            The Creator ${creator.name} is currently blacklisted. Videos are not allowed to be submitted or linked to in chat channels.
                            \n\n
                            If you feel this action was erroneous mention moderators here with \`@Moderation Team\`.`
                                });

                                return;
                            }
                        }
                    }
                }
            }
        }
    }
}
