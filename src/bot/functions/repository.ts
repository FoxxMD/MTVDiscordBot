import {GuildMember, APIInteractionGuildMember} from "discord.js";
import {Sequelize} from "sequelize";
import {User} from "../../common/db/models/user.js";

export const getOrInsertUser = async (member: GuildMember | APIInteractionGuildMember, db: Sequelize) => {
    // TODO reduce eager loading
    let user = await User.findOne({where: {name: member.user.username}, include: {all: true, nested: true}});
    if(user === null) {
        user = await User.create({
            name: member.user.username
        });
        await user.createTrustLevel({
            trustLevelId: 1
        });
    }
    return user;
}
