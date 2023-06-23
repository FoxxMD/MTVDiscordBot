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
import {User} from "./user.js";

export class Guild extends Model<InferAttributes<Guild, { omit: 'users'}>, InferCreationAttributes<Guild>> {

  declare id: CreationOptional<number>;
  declare snowflake: string;
  declare name: string

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getUsers: HasManyGetAssociationsMixin<User>;
  declare addUser: HasManyAddAssociationMixin<User, number>;

  declare users?: NonAttribute<User[]>;

  declare static associations: {
    users: Association<Guild, User>;
  };
}

export const init = (sequelize: Sequelize) => {
  Guild.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    snowflake: DataTypes.STRING,
    name: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'Guild',
    indexes: [
      {
        unique: true,
        fields: ['snowflake']
      },
    ]
  });
}

export const associate = () => {
  Guild.hasMany(User, {
    foreignKey: 'guildId',
    sourceKey: 'id',
    as: 'users'
  });
}
