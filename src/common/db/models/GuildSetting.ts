'use strict';
import {
    InferAttributes,
    InferCreationAttributes,
    Sequelize,
    DataTypes,
    CreationOptional,
    Association,
    Model,
    NonAttribute, HasManyGetAssociationsMixin, HasManyAddAssociationMixin, HasManyRemoveAssociationMixin, ForeignKey
} from "sequelize";
import {Guild} from "./Guild.js";
import {SimpleError} from "../../../utils/Errors.js";

export class GuildSetting extends Model<InferAttributes<GuildSetting>, InferCreationAttributes<GuildSetting>> {

    declare id: CreationOptional<number>;
    declare guildId: ForeignKey<Guild['id']>;
    declare name: string;
    declare type: string;
    declare value: string;

    valueCast = <T>(): T => {
        switch (this.type) {
            case 'string':
                return this.value as T;
            case 'boolean':
                // @ts-ignore
                return this.value === '1' as T;
            case 'number':
                return Number.parseInt(this.value) as T;
            default:
                throw new SimpleError(`Guild Setting '${this.name}' type was not valid: ${this.type}`);
        }
    }

    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export const init = (sequelize: Sequelize) => {
    GuildSetting.init({
        id: {
            type: DataTypes.INTEGER.UNSIGNED,
            autoIncrement: true,
            primaryKey: true
        },
        guildId: DataTypes.INTEGER,
        name: DataTypes.STRING,
        type: DataTypes.STRING,
        value: DataTypes.STRING,
        createdAt: DataTypes.DATE,
        updatedAt: DataTypes.DATE,
    }, {
        sequelize,
        modelName: 'GuildSetting',
        indexes: [
            {
                unique: true,
                fields: ['guildId', 'name']
            },
        ]
    });
}

export const associate = () => {
    GuildSetting.belongsTo(Guild, {foreignKey: 'guildId', as: 'guild'});
}
