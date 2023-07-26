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
    HasOneSetAssociationMixin,
    ForeignKey,
    BelongsToGetAssociationMixin,
    BelongsToManyRemoveAssociationMixin,
    Transaction, Op, fn
} from 'sequelize';
import {VideoSubmission} from "./videosubmission.js";
import {Creator} from "./creator.js";
import {UserTrustLevel} from "./UserTrustLevel.js";
import {Guild} from "./Guild.js";
import {SpecialRoleType} from "../../infrastructure/Atomic.js";
import {ShowcasePost} from "./ShowcasePost.js";
import {AllowDenyModifier, AllowDenyModifierData} from "./AllowDenyModifier.js";
import dayjs, {Dayjs} from "dayjs";
import {SubmissionTrustLevel} from "./SubmissionTrustLevel.js";

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

    declare getShowcases: HasManyGetAssociationsMixin<ShowcasePost>;
    declare addShowcase: HasManyAddAssociationMixin<ShowcasePost, number>;
    declare removeShowcase: HasManyRemoveAssociationMixin<ShowcasePost, number>;
    declare createShowcase: HasManyCreateAssociationMixin<ShowcasePost, 'userId'>;

    declare createCreator: BelongsToManyCreateAssociationMixin<Creator>;
    declare addCreator: BelongsToManyAddAssociationMixin<Creator, 'CreatorId'>;
    declare removeCreator: BelongsToManyRemoveAssociationMixin<Creator, 'CreatorId'>;
    declare getCreators: BelongsToManyGetAssociationsMixin<Creator>;

    declare getTrustLevel: HasOneGetAssociationMixin<UserTrustLevel>;
    declare createTrustLevel: HasOneCreateAssociationMixin<UserTrustLevel>;
    // declare setTrustLevel: HasOneSetAssociationMixin<UserTrustLevel, 'id'>;

    declare getGuild: BelongsToGetAssociationMixin<Guild>;

    declare getModifiers: HasManyGetAssociationsMixin<AllowDenyModifier>;
    declare getActiveModifiers: HasManyGetAssociationsMixin<AllowDenyModifier>;
    declare createModifier: HasManyCreateAssociationMixin<AllowDenyModifier, 'modifiedThingId'>;

    declare submissions?: NonAttribute<VideoSubmission[]>;
    declare showcases?: NonAttribute<ShowcasePost[]>;
    declare creators?: NonAttribute<Creator[]>;
    declare trustLevel: NonAttribute<UserTrustLevel>;
    declare guild: NonAttribute<Guild>
    declare modifiers?: NonAttribute<AllowDenyModifier[]>;

    declare static associations: {
        submissions: Association<User, VideoSubmission>
        showcases: Association<User, ShowcasePost>
        creators: Association<User, Creator>
        trustLevel: Association<User, UserTrustLevel>
        modifiers: Association<User, AllowDenyModifier>
    };

    get uniqueDiscordId(): NonAttribute<string> {
        return `${this.discordId}-${this.guildId}`;
    }

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

    getActiveModifier = async () => {
        const mods = await this.getActiveModifiers();
        if(mods.length > 0) {
            return mods[0];
        }
        return undefined;
    }

    expireModifiers = async (at: Dayjs = dayjs(), transaction?: Transaction) => {
        const t = transaction ?? await this.sequelize.transaction();
        const activeMods = await this.getActiveModifiers();
        for (const a of activeMods) {
            a.expiresAt = at.toDate();
            await a.save({transaction: t});
        }
        if (activeMods.length > 0 && transaction === undefined) {
            try {
                await t.commit();
            } catch (e) {
                await t.rollback();
                throw e;
            }
        }
    }

    createNewModifier = async (data: AllowDenyModifierData) => {
        const t = await this.sequelize.transaction();
        await this.expireModifiers(undefined, t);
        const newModifier = await this.createModifier({
            modifiedThingType: 'user',
            ...data
        }, {transaction: t});
        try {
            await t.commit();
            return newModifier;
        } catch (e) {
            await t.rollback();
            throw e;
        }
    }

    getShowcasesCount = async () => {
        return await ShowcasePost.count({where: {userId: this.id}});
    }

    calculateCommunityTrust = async () => {
        const levels = await SubmissionTrustLevel.findAll();
        const count = await this.getShowcasesCount();

        levels.sort((a, b) => a.acceptableSubmissionsThreshold - b.acceptableSubmissionsThreshold);
        for(const l of levels) {
            if(count <= l.acceptableSubmissionsThreshold) {
                return l;
            }
        }
        // more than the top level, return top level
        return levels[levels.length - 1];
    }

    setCommunityTrustLevel = async (levelVal?: number | SubmissionTrustLevel, givenByUser?: User) => {
        let level: SubmissionTrustLevel;
        if (levelVal instanceof SubmissionTrustLevel) {
            level = levelVal;
        } else if(typeof levelVal === 'number') {
            const levels = await SubmissionTrustLevel.findAll();
            levels.sort((a, b) => a.acceptableSubmissionsThreshold - b.acceptableSubmissionsThreshold);
            for (const l of levels) {
                if (levelVal <= l.acceptableSubmissionsThreshold) {
                    level = l;
                }
            }
            // more than the top level, return top level
            if (level === undefined) {
                level = levels[levels.length - 1];
            }
        } else {
            level = await this.calculateCommunityTrust();
        }

        const userLevel = await this.getTrustLevel();
        const currentUserSubmissionLevel = await userLevel.getLevel();
        if (currentUserSubmissionLevel.id === level.id) {
            return;
        }
        await userLevel.setLevel(level);
        await userLevel.setGivenBy(givenByUser);
        await userLevel.save();
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
    User.hasMany(ShowcasePost, {
        sourceKey: 'id',
        foreignKey: 'userId',
        as: 'showcases'
    });
    User.belongsToMany(Creator, {through: 'UserCreators'});
    User.hasOne(UserTrustLevel, {foreignKey: 'userId', as: 'trustLevel'});
    User.belongsTo(Guild, {as: 'guild'});
    User.hasMany(AllowDenyModifier, {
        foreignKey: 'modifiedThingId',
        as: 'modifiers',
        scope: {
            modifiedThingType: 'user'
        }
    });
    User.hasMany(AllowDenyModifier, {
        foreignKey: 'modifiedThingId',
        as: 'activeModifiers',
        scope: {
            modifiedThingType: 'user',
            expiresAt: {
                [Op.or]: [
                    {
                        [Op.is]: null
                    },
                    {
                        [Op.gt]: fn('NOW')
                    }
                ]
            }
        }
    })
}
