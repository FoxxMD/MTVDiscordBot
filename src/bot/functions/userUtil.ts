import {User} from "../../common/db/models/user.js";
import {submissionInGoodStanding} from "./index.js";
import {EmbedBuilder, GuildMember} from "discord.js";
import dayjs from "dayjs";
import {InteractionLike, SpecialRoleType} from "../../common/infrastructure/Atomic.js";
import {getOrInsertGuild} from "./repository.js";
import {intersect} from "../../utils/index.js";

export const buildStandingProfile = async (user: User) => {
    const submissions = await user.getSubmissions();
    const submissionsWithGoodStanding = submissions.filter(x => submissionInGoodStanding(x)).length;
    const [upVotes, downVotes] = submissions.reduce((acc, curr) => {
        return [acc[0] + curr.upvotes, acc[1] + curr.downvotes];
    }, [0, 0]);
    const creators = await user.getCreators();

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('Your Standing')
        .setDescription(`Level: ${user.trustLevel.level.name}`)
        .setTimestamp()

    if (creators.length > 0) {
        embed.addFields({
            name: 'Verified Creator',
            value: creators.map(x => `(${x.platform}) ${x.name}`).join('\n')
        })
    }

    embed.addFields({
        name: 'First Submission Seen',
        value: submissions.length === 0 ? 'Just Lurking!' : dayjs(submissions[0].createdAt).format()
    })

    embed.addFields(
        {name: '\u200B', value: '\u200B'},
        {name: 'Total Submissions', value: submissions.length.toString(), inline: true},
        {name: 'Total Submission IGS', value: submissionsWithGoodStanding.toString(), inline: true},
        {name: '\u200B', value: '\u200B'},
        {name: 'Upvotes', value: upVotes.toString(), inline: true},
        {name: 'Downvotes', value: downVotes.toString(), inline: true},
    );

    return embed;
}

export const memberHasRoleType = async (roleType: SpecialRoleType, interaction: InteractionLike) => {
    const guild = await getOrInsertGuild(interaction.guild);
    const roles = interaction.member.roles as string[];

    const specialRoles = await guild.getRoleIdsByType(roleType);

    return (intersect(roles, specialRoles)).length > 0;
}
