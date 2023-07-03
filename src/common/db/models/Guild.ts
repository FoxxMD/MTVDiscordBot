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
    HasManyAddAssociationMixin,
    HasManyRemoveAssociationMixin,
    ForeignKey,
    HasManySetAssociationsMixin, HasManyCreateAssociationMixin
} from "sequelize";
import {User} from "./user.js";
import {GuildSetting} from "./GuildSetting.js";
import {valToString} from "../../../utils/index.js";

export class Guild extends Model<InferAttributes<Guild, { omit: 'users' | 'settings' }>, InferCreationAttributes<Guild>> {

    declare id: string;
    declare name: string

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;

    declare getUsers: HasManyGetAssociationsMixin<User>;
    declare addUser: HasManyAddAssociationMixin<User, number>;

    declare getSettings: HasManyGetAssociationsMixin<GuildSetting>;
    declare addSetting: HasManyAddAssociationMixin<GuildSetting, number>;
    declare createSetting: HasManyCreateAssociationMixin<GuildSetting>;

    declare users?: NonAttribute<User[]>;
    declare settings?: NonAttribute<GuildSetting[]>

    declare static associations: {
        users: Association<Guild, User>;
        settings: Association<Guild, GuildSetting>
    };

    getSetting = async (name: string): Promise<(GuildSetting | undefined)> => {
        if (this.settings === undefined) {
            //throw new SimpleError(`Settings have not been loaded for Guild ${this.id}`);
            this.settings = await this.getSettings();
        }

        const setting = this.settings.find(x => x.name.toLowerCase() === name.toLowerCase());
        if (setting === undefined) {
            return undefined;
        }
        return setting;
    }

    getSettingValue = async <T>(name: string): Promise<(T | undefined)> => {
        const setting = await this.getSetting(name);
        if (setting !== undefined) {
            return setting.valueCast<T>();
        }
        return undefined;
    }

    upsertSetting = async (name: string, value: any): Promise<GuildSetting> => {
        // look for existing
        const existing = await this.getSetting(name);
        if (existing !== undefined) {
            existing.value = valToString(value);
            await this.addSetting(existing);
            await existing.save();
            return existing;
        } else {
            return await this.createSetting({
               // guildId: this.id,
                type: typeof value,
                name,
                value: valToString(value)
            });
        }
    }
}

export const init = (sequelize: Sequelize) => {
    Guild.init({
        id: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        name: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, {
        sequelize,
        modelName: 'Guild'
    });
}

export const associate = () => {
    Guild.hasMany(User, {
        foreignKey: 'guildId',
        sourceKey: 'id',
        as: 'users'
    });
    Guild.hasMany(GuildSetting, {
        foreignKey: 'guildId',
        sourceKey: 'id',
        as: 'settings'
    });
}
