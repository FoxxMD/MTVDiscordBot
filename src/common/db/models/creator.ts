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
  BelongsToManyGetAssociationsMixin
} from "sequelize";
import {Video} from "./video.js";
import {User} from "./user.js";

export class Creator extends Model<InferAttributes<Creator, { omit: 'videos' | 'users' }>, InferCreationAttributes<Creator>> {

  declare id: CreationOptional<number>;
  declare platform: string;
  declare platformId: string;
  declare name: CreationOptional<string>;
  declare nsfw: boolean;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getVideos: HasManyGetAssociationsMixin<Video>;
  declare getUsers: BelongsToManyGetAssociationsMixin<User>;

  declare videos?: NonAttribute<Video[]>;
  declare users?: NonAttribute<User[]>;

  declare static associations: {
    videos: Association<Creator, Video>;
    users: Association<Creator, User>
  };
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
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'Creator',
    indexes: [
      {
        unique: true,
        fields: ['platform','platformId']
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
}
