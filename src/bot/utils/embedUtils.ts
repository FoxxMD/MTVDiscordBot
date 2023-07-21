import {User} from "../../common/db/models/user.js";
import {submissionInGoodStanding} from "../functions/index.js";
import {
    channelMention,
    EmbedBuilder,
    HexColorString,
    TextBasedChannel,
    TextBasedChannelMixin,
    time,
    userMention
} from "discord.js";
import {buildDiscordMessageLink, detectErrorStack, markdownTag} from "../../utils/StringUtils.js";
import {LogInfo, LogLevel, MessageLike} from "../../common/infrastructure/Atomic.js";

export const buildStandingProfile = async (user: User) => {
    const submissions = await user.getSubmissions();
    const submissionsWithGoodStanding = submissions.filter(x => submissionInGoodStanding(x)).length;
    const [upVotes, downVotes] = submissions.reduce((acc, curr) => {
        return [acc[0] + curr.upvotes, acc[1] + curr.downvotes];
    }, [0, 0]);
    const creators = await user.getCreators();
    const level = await user.getSubmissionLevel();

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Your Standing')
        .setDescription(`Level: ${level.name}`)
        .setTimestamp()

    if (creators.length > 0) {
        embed.addFields({
            name: 'Verified Creator',
            value: markdownTag`${creators.map(x => `(${x.platform}) ${x.name}`)}`
        })
    }

    embed.addFields({
        name: 'First Submission Seen',
        value: submissions.length === 0 ? 'Just Lurking!' : time(submissions[0].createdAt)
    })

    let lastSubs = '-';
    if (submissions.length > 0) {
        const lVideos = submissions.slice(-3);
        const lSummary: string[] = [];
        for (const sub of lVideos) {
            lSummary.push(await sub.summary({linkVideo: true, showDiscord: true}));
        }
        lastSubs = markdownTag`${lSummary}`;
    }

    embed.addFields(
        {name: '\u200B', value: '\u200B'},
        {
            name: 'Total Submissions',
            value: `${submissions.length.toString()} (${submissionsWithGoodStanding.toString()} In Good Standing)`,
            inline: true
        },
        {name: 'Upvotes', value: upVotes.toString(), inline: true},
        {name: 'Downvotes', value: downVotes.toString(), inline: true},
        {
            name: 'Last 3 Submissions',
            value: lastSubs
        },
    );

    const showcases = await user.getShowcases();

    embed.addFields(
        {name: '\u200B', value: '\u200B'},
        {
            name: 'Total Showcases',
            value: `${showcases.length.toString()}`,
            inline: true
        }
    );

    return embed;
}

export interface LogStatementOptions {
    discordMessage?: MessageLike | string
    channel?: TextBasedChannel | string
    guildId?: string
}
export const buildLogStatement = async (log: LogInfo, options?: LogStatementOptions) => {

    const {
        discordMessage: dMsgOpt,
        channel: channelOpt,
        guildId
    } = options;

    const {
        discordMessage = dMsgOpt,
        channel = channelOpt,
        stack,
    } = log;

    const embed = new EmbedBuilder()
        .setColor(embedLogLevelColor(log.level as LogLevel))
        .setTitle(log.level.toUpperCase())
        .setTimestamp();

    //const msgPrefix = log.byDiscordUser !== undefined ? `${userMention(log.byDiscordUser)}: ` : '';

    embed.setDescription(log.message);

    if(stack !== undefined) {
        embed.addFields({
            name: 'Stacktrace',
            value: `\`\`\`${stack}\`\`\``.slice(0, 1023)
        })
    }

    if(log.byDiscordUser !== undefined) {
        embed.addFields({
            name: 'Initiated By',
            value: userMention(log.byDiscordUser),
            inline: true
        });
    }

    let channelStr: string;
    let messageStr: string;

    if(channel !== undefined) {
        if(typeof channel === 'string') {
            channelStr = channelMention(channel);
        } else {
            channelStr = channelMention(channel.id);
        }
    }
    if(discordMessage !== undefined) {
        if(typeof discordMessage === 'string') {
            messageStr = discordMessage;
        } else {
            embed.setURL(buildDiscordMessageLink(discordMessage.guildId, discordMessage.channelId, discordMessage.id));
            messageStr = discordMessage.id;
            if(channelStr === undefined) {
                channelStr = channelMention(discordMessage.channelId);
            }
        }
    }

    if(channelStr !== undefined) {
        embed.addFields({
            name: 'Channel',
            value: channelStr,
            inline: true
        });
    }

    if(messageStr !== undefined) {
        embed.addFields({
            name: 'Message',
            value: messageStr,
            inline: true
        });
    }

    const labels = log.labels.filter(x => !x.toLowerCase().includes('guild'));
    if(labels.length > 0) {
        embed.setFooter({text: labels.map(x => `[${x}]`).join(' ')});
    }
    return embed;
}

export const EmbedSidebarColors: Record<string, HexColorString> = {
    RED: '#e71010',
    YELLOW: '#f5e63a',
    ORANGE: '#fa6a0a',
    GREEN: '#15ec15',
    BLUE: '#0e6feb'
}

export const embedLogLevelColor = (level: LogLevel): HexColorString | undefined => {
    switch (level) {
        case 'info':
            return EmbedSidebarColors.BLUE;
        case 'warn':
            return EmbedSidebarColors.ORANGE;
        case 'error':
            return EmbedSidebarColors.RED;
        case 'safety':
            return EmbedSidebarColors.YELLOW;
        default:
            return undefined;
    }
}