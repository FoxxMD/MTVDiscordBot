import {User} from "../../common/db/models/user.js";
import {submissionInGoodStanding} from "./index.js";
import {EmbedBuilder, GuildMember, GuildMemberRoleManager, time} from "discord.js";
import dayjs from "dayjs";
import {InteractionLike, SpecialRoleType} from "../../common/infrastructure/Atomic.js";
import {getOrInsertGuild} from "./repository.js";
import {intersect} from "../../utils/index.js";
import {markdownTag} from "../../utils/StringUtils.js";

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
    if(submissions.length > 0) {
        const lVideos = submissions.slice(-3);
        const lSummary: string[] = [];
        for(const sub of lVideos) {
            lSummary.push(await sub.summary({linkVideo: true, showDiscord: true}));
        }
        lastSubs = markdownTag`${lSummary}`;
    }

    embed.addFields(
        {name: '\u200B', value: '\u200B'},
        {name: 'Total Submissions',
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
        {name: 'Total Showcases',
            value: `${showcases.length.toString()}`,
            inline: true
        }
    );

    return embed;
}

export const memberHasRoleType = async (roleType: SpecialRoleType, interaction: InteractionLike) => {
    const guild = await getOrInsertGuild(interaction.guild);
    const roles = (interaction.member.roles as GuildMemberRoleManager).cache.map(x => x.id);

    const specialRoles = await guild.getRoleIdsByType(roleType);

    return (intersect(roles, specialRoles)).length > 0;
}
