'use strict';
import {
    InferAttributes,
    InferCreationAttributes,
    Sequelize,
    DataTypes,
    CreationOptional,
    Association,
    Model,
    NonAttribute,
    HasManyGetAssociationsMixin,
    BelongsToManyGetAssociationsMixin,
    ForeignKey,
    HasOneGetAssociationMixin,
    HasOneSetAssociationMixin,
    HasManyCreateAssociationMixin,
    Op, Transaction, fn
} from "sequelize";
import {Video} from "./video.js";
import {User} from "./user.js";
import {FullCreatorDetails} from "../../infrastructure/Atomic.js";
import {AllowDenyModifier, AllowDenyModifierData} from "./AllowDenyModifier.js";
import dayjs, {Dayjs} from "dayjs";

export class Creator extends Model<InferAttributes<Creator, {
    omit: 'videos' | 'users'
}>, InferCreationAttributes<Creator>> {

    declare id: CreationOptional<number>;
    declare platform: string;
    declare platformId: string;
    declare name: CreationOptional<string>;
    declare nsfw: boolean;
    declare popular: CreationOptional<boolean>;
    declare platformCreatedAt: CreationOptional<Date>;

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
    
    declare getModifiers: HasManyGetAssociationsMixin<AllowDenyModifier>;
    declare getActiveModifiers: HasManyGetAssociationsMixin<AllowDenyModifier>;
    declare createModifier: HasManyCreateAssociationMixin<AllowDenyModifier, 'modifiedThingId'>;

    declare getVideos: HasManyGetAssociationsMixin<Video>;
    declare getUsers: BelongsToManyGetAssociationsMixin<User>;

    declare videos?: NonAttribute<Video[]>;
    declare users?: NonAttribute<User[]>;
    declare modifiers?: NonAttribute<AllowDenyModifier[]>;

    declare static associations: {
        videos: Association<Creator, Video>;
        users: Association<Creator, User>;
        modifiers: Association<Creator, AllowDenyModifier>;
    };
    populateFromDetails = (details: FullCreatorDetails) => {
        this.name = details.name;
        this.platformCreatedAt = details.createdAt;
        switch (this.platform) {
            case 'youtube':
                this.popular = details.followers > 100000;
                break;
            case 'vimeo':
                this.popular = details.followers > 1000;
        }
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
            modifiedThingType: 'creator',
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
}

export const init = (sequelize: Sequelize) => {
    Creator.init({
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        platform: DataTypes.STRING,
        name: DataTypes.STRING,
        platformId: DataTypes.STRING,
        nsfw: DataTypes.BOOLEAN,
        popular: {
            type: DataTypes.BOOLEAN,
        },
        platformCreatedAt: DataTypes.DATE,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, {
        sequelize,
        modelName: 'Creator',
        indexes: [
            {
                unique: true,
                fields: ['platform', 'platformId']
            }
        ]
    });
}

export const associate = () => {
    Creator.hasMany(Video, {
        foreignKey: 'creatorId',
        sourceKey: 'id',
        as: 'videos'
    });
    Creator.belongsToMany(User, {through: 'UserCreators'});
    Creator.hasMany(AllowDenyModifier, {
        foreignKey: 'modifiedThingId',
        as: 'modifiers',
        scope: {
            modifiedThingType: 'creator'
        }
    });
    Creator.hasMany(AllowDenyModifier, {
        foreignKey: 'modifiedThingId',
        as: 'activeModifiers',
        scope: {
            modifiedThingType: 'creator',
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
