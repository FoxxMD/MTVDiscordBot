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
  BelongsToSetAssociationMixin, BelongsToGetAssociationMixin
} from "sequelize";
import {VideoSubmission} from "./videosubmission.js";
import {Creator} from "./creator.js";
import {User} from "./user.js";
import {ShowcasePost} from "./ShowcasePost.js";
import dayjs from "dayjs";

export class Video extends Model<InferAttributes<Video, { omit: 'submissions'}>, InferCreationAttributes<Video>> {

  declare id: CreationOptional<number>;
  declare platform: string;
  declare creatorId: ForeignKey<Creator['id']>;
  declare platformId: string;
  declare title: string;
  declare url: string;
  declare length: CreationOptional<number>;
  declare nsfw: boolean;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getSubmissions: HasManyGetAssociationsMixin<VideoSubmission>;
  declare addSubmission: HasManyAddAssociationMixin<VideoSubmission, number>;
  declare removeSubmission: HasManyRemoveAssociationMixin<VideoSubmission, number>;
  declare getShowcases: HasManyGetAssociationsMixin<ShowcasePost>;

  declare setCreator: BelongsToSetAssociationMixin<Creator, number>
  declare getCreator: BelongsToGetAssociationMixin<Creator>

  declare submissions?: NonAttribute<VideoSubmission[]>;
  declare creator?: NonAttribute<Creator>
  declare showcases?: NonAttribute<ShowcasePost>

  declare static associations: {
    submissions: Association<Video, VideoSubmission>;
    showcases: Association<Video, ShowcasePost>;
  };

  getLastSubmission = async () => {
    const subs = await this.getSubmissions();
    if (subs.length > 0) {
      subs.sort((a, b) => b.id - a.id);
      return subs[0];
    }
    return undefined;
  }

  validForSubmission = async () => {
    const lastSubmission = await this.getLastSubmission();
    if (lastSubmission === undefined) {
      return true;
    }
    return dayjs(lastSubmission.createdAt).isBefore(dayjs().subtract(dayjs.duration('30 days')));
  }
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
    title: DataTypes.STRING,
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
