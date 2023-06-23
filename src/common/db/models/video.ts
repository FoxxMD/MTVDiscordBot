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
import {VideoSubmission} from "./videosubmission.js";
import {Creator} from "./creator.js";
import {User} from "./user.js";
import {ShowcasePost} from "./ShowcasePost.js";

export class Video extends Model<InferAttributes<Video, { omit: 'submissions'}>, InferCreationAttributes<Video>> {

  declare id: CreationOptional<number>;
  declare platform: string;
  declare creatorId: ForeignKey<Creator['id']>;
  declare platformId: string;
  declare url: string;
  declare length: CreationOptional<number>;
  declare nsfw: boolean;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getSubmissions: HasManyGetAssociationsMixin<VideoSubmission>;
  declare addSubmission: HasManyAddAssociationMixin<VideoSubmission, number>;
  declare removeSubmission: HasManyRemoveAssociationMixin<VideoSubmission, number>;
  declare getShowcases: HasManyGetAssociationsMixin<ShowcasePost>;

  declare submissions?: NonAttribute<VideoSubmission[]>;
  declare creator?: NonAttribute<Creator>
  declare showcases?: NonAttribute<ShowcasePost>

  declare static associations: {
    submissions: Association<Video, VideoSubmission>;
    showcases: Association<Video, ShowcasePost>;
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
    creatorId: DataTypes.INTEGER,
    platformId: DataTypes.STRING,
    url: DataTypes.STRING,
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
      },
      {
        unique: false,
        fields: ['url']
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
  Video.hasMany(ShowcasePost, {
    foreignKey: 'videoId',
    sourceKey: 'id',
    as: 'showcases'
  });
  Video.belongsTo(Creator, {targetKey: 'id', as: 'creator'});
}
