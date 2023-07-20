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
import {FullCreatorDetails, Platform, PopularityThresholdLevel} from "../../infrastructure/Atomic.js";
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
    declare popular: CreationOptional<number>;
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
        const popLevel = Creator.parsePopularity(this.platform, details);
        if(popLevel === undefined) {
            this.popular = null;
        } else {
            this.popular = popLevel;
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

    isPopular() {
        return this.popular >= 5;
    }

    static parsePopularity(platform: Platform, details: FullCreatorDetails): number | undefined {
        if(details.followers === undefined || details.followers === null) {
            return undefined;
        }
        if(PopularityThresholds[platform] !== undefined) {
            for(const thresh of PopularityThresholds[platform]) {
                if(details.followers < thresh.count) {
                    return thresh.level;
                }
            }
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
            type: DataTypes.INTEGER,
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

export const PopularityThresholds: Record<Platform, PopularityThresholdLevel[]> = {
    // based on https://timqueen.com/youtube-number-of-channels/
    youtube: [
        {
            count: 100, level: 0
        },
        {
            count: 1000, level: 1
        },
        {
            count: 5000, level: 2
        },
        {
            count: 10000, level: 3
        },
        {
            count: 50000, level: 4
        },
        {
            count: 100000, level: 5
        },
        {
            count: 500000, level: 6
        },
        {
            count: 1000000, level: 7
        },
        {
            count: 10000000, level: 8
        },
        {
            count: 50000000, level: 9
        },
        {
            count: 100000000, level: 10
        }
    ],
    vimeo: [
        {
            count: 10, level: 0
        },
        {
            count: 50, level: 1
        },
        {
            count: 100, level: 2
        },
        {
            count: 200, level: 3
        },
        {
            count: 300, level: 4
        },
        {
            count: 500, level: 5
        },
        {
            count: 750, level: 6
        },
        {
            count: 1500, level: 7
        },
        {
            count: 3000, level: 8
        },
        {
            count: 5000, level: 9
        },
        {
            count: 10000, level: 10
        }
    ]
}
