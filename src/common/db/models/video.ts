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
import {VideoSubmission} from "./videosubmission.js";

export class Video extends Model<InferAttributes<Video, { omit: 'submissions' }>, InferCreationAttributes<Video>> {

  declare id: CreationOptional<number>;
  declare platform: string;
  declare creatorName: CreationOptional<string>;
  declare creatorId: CreationOptional<string>;
  declare platformId: string;
  declare length: number;
  declare nsfw: boolean;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getSubmissions: HasManyGetAssociationsMixin<VideoSubmission>;
  declare addSubmission: HasManyAddAssociationMixin<VideoSubmission, number>;
  declare removeSubmission: HasManyRemoveAssociationMixin<VideoSubmission, number>;

  declare submissions?: NonAttribute<VideoSubmission[]>;

  declare static associations: {
    submissions: Association<Video, VideoSubmission>;
  };
}

export const init = (sequelize: Sequelize) => {
  Video.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    platform: DataTypes.STRING,
    creatorName: DataTypes.STRING,
    creatorId: DataTypes.STRING,
    platformId: DataTypes.STRING,
    length: DataTypes.INTEGER.UNSIGNED,
    nsfw: DataTypes.BOOLEAN,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'Video',
    indexes: [
      {
        unique: true,
        fields: ['platform','platformId']
      }
    ]
  });
}

export const associate = () => {
  Video.hasMany(VideoSubmission, {
    foreignKey: 'videoId',
    sourceKey: 'id',
    as: 'submissions'
  });
}

// module.exports = (sequelize: Sequelize, _: any) => {
//   class Video extends Model<InferAttributes<Video>, InferCreationAttributes<Video>> {
//
//     declare id: CreationOptional<number>;
//     declare platform: string;
//     declare creatorName: CreationOptional<string>;
//     declare creatorId: CreationOptional<string>;
//     declare platformId: string;
//     declare length: number;
//     declare nsfw: boolean;
//
//     declare createdAt: CreationOptional<Date>;
//     declare updatedAt: CreationOptional<Date>;
//
//     declare static associations: {
//       projects: Association<Video, VideoSubmission>;
//     };
//
//     /**
//      * Helper method for defining associations.
//      * This method is not a part of Sequelize lifecycle.
//      * The `models/index` file will call this method automatically.
//      */
//     static associate(models) {
//
//     }
//   }
//   Video.init({
//     platform: DataTypes.STRING,
//     creatorName: DataTypes.STRING,
//     creatorId: DataTypes.STRING,
//     platformId: DataTypes.STRING,
//     length: DataTypes.INTEGER.UNSIGNED,
//     nsfw: DataTypes.BOOLEAN
//   }, {
//     sequelize,
//     modelName: 'Video',
//   });
//   return Video;
// };
