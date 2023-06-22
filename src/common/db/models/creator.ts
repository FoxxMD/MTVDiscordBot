'use strict';
import {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
  CreationOptional,
  Association,
  Model,
  NonAttribute, HasManyGetAssociationsMixin, HasManyAddAssociationMixin, HasManyRemoveAssociationMixin
} from "sequelize";
import {Video} from "./video.js";

export class Creator extends Model<InferAttributes<Creator, { omit: 'videos' }>, InferCreationAttributes<Creator>> {

  declare id: CreationOptional<number>;
  declare platform: string;
  declare platformId: string;
  declare name: CreationOptional<string>;
  declare nsfw: boolean;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getVideos: HasManyGetAssociationsMixin<Video>;

  declare videos?: NonAttribute<Video[]>;

  declare static associations: {
    videos: Association<Creator, Video>;
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
}
