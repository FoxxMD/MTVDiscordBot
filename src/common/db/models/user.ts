import {
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    Sequelize,
    DataTypes,
    NonAttribute,
    Association,
    HasManyGetAssociationsMixin,
    HasManyAddAssociationMixin,
    HasManyRemoveAssociationMixin,
    HasManyCreateAssociationMixin,
    BelongsToManyAddAssociationMixin,
    BelongsToManyCreateAssociationMixin,
    BelongsToManyGetAssociationsMixin,
    HasOneCreateAssociationMixin,
    HasOneGetAssociationMixin,
    HasOneSetAssociationMixin, ForeignKey, BelongsToGetAssociationMixin, BelongsToManyRemoveAssociationMixin
} from 'sequelize';
import {VideoSubmission} from "./videosubmission.js";
import {Creator} from "./creator.js";
import {UserTrustLevel} from "./UserTrustLevel.js";
import {Guild} from "./Guild.js";
import {SpecialRoleType} from "../../infrastructure/Atomic.js";

export class User extends Model<InferAttributes<User, {
    omit: 'submissions' | 'creators' | 'trustLevel'
}>, InferCreationAttributes<User, { omit: 'submissions' | 'creators' | 'trustLevel' }>> {

    declare id: CreationOptional<number>;
    declare name: string;
    declare discordId: string;
    declare guildId: ForeignKey<Guild['id']>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare getSubmissions: HasManyGetAssociationsMixin<VideoSubmission>;
    declare addSubmission: HasManyAddAssociationMixin<VideoSubmission, number>;
    declare removeSubmission: HasManyRemoveAssociationMixin<VideoSubmission, number>;
    declare createSubmission: HasManyCreateAssociationMixin<VideoSubmission, 'userId'>;

    declare createCreator: BelongsToManyCreateAssociationMixin<Creator>;
    declare addCreator: BelongsToManyAddAssociationMixin<Creator, 'CreatorId'>;
    declare removeCreator: BelongsToManyRemoveAssociationMixin<Creator, 'CreatorId'>;
    declare getCreators: BelongsToManyGetAssociationsMixin<Creator>;

    declare getTrustLevel: HasOneGetAssociationMixin<UserTrustLevel>;
    declare createTrustLevel: HasOneCreateAssociationMixin<UserTrustLevel>;
    // declare setTrustLevel: HasOneSetAssociationMixin<UserTrustLevel, 'id'>;

    declare getGuild: BelongsToGetAssociationMixin<Guild>;

    declare submissions?: NonAttribute<VideoSubmission[]>;
    declare creators?: NonAttribute<Creator[]>;
    declare trustLevel: NonAttribute<UserTrustLevel>;
    declare guild: NonAttribute<Guild>

    declare static associations: {
        submissions: Association<User, VideoSubmission>;
        creators: Association<User, Creator>
        trustLevel: Association<User, UserTrustLevel>
    };

    isRateLimited = async (date: Date) => {
        const userLevel = await this.getTrustLevel();
        const level = await userLevel.getLevel();
        return level.isRateLimited(date);
    }

    rateLimitRemaining = async (date: Date) => {
        const userLevel = await this.getTrustLevel();
        const level = await userLevel.getLevel();
        return level.limitRemaining(date);
    }

    getSubmissionLevel = async () => {
        const userLevel = await this.getTrustLevel();
        const level = await userLevel.getLevel();
        return level;
    }
}

export const init = (sequelize: Sequelize) => {
    User.init({
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true
        },
        discordId: DataTypes.STRING,
        guildId: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, {
        sequelize,
        modelName: 'User',
        indexes: [
            {
                unique: true,
                fields: ['name', 'guildId']
            }
        ]
    });
}

export const associate = () => {
    User.hasMany(VideoSubmission, {
        sourceKey: 'id',
        foreignKey: 'userId',
        as: 'submissions'
    });
    User.belongsToMany(Creator, {through: 'UserCreators'});
    User.hasOne(UserTrustLevel, {foreignKey: 'userId', as: 'trustLevel'});
    User.belongsTo(Guild, {as: 'guild'});
}
