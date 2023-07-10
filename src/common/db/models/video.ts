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
import {MinimalVideoDetails, VideoDetails} from "../../infrastructure/Atomic.js";

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

  getLastShowcase = async () => {
    const subs = await this.getShowcases();
    if (subs.length > 0) {
      subs.sort((a, b) => b.id - a.id);
      return subs[0];
    }
    return undefined;
  }

  getMostRecentPost = async () => {
    const lastSubmission = await this.getLastSubmission();
    const lastShowcase = await this.getLastShowcase();

    if(lastSubmission === undefined && lastShowcase === undefined) {
      return undefined;
    }
    if(lastSubmission !== undefined && lastShowcase === undefined) {
      return lastSubmission;
    }
    if(lastShowcase !== undefined && lastSubmission === undefined) {
      return lastShowcase;
    }
    if(dayjs(lastSubmission.createdAt).isAfter(lastShowcase.createdAt)) {
      return lastSubmission;
    }
    return lastShowcase;
  }

  validForSubmission = async () => {
    const mostRecent = await this.getMostRecentPost();
    if(mostRecent === undefined) {
      return true;
    }
    const monthAgo = dayjs().subtract(30, 'days');
    if(dayjs(mostRecent.createdAt).isAfter(monthAgo)) {
      return false;
    }

    return true;
  }

  isOC = async () => {
    const creatorUsers = await this.getCreatorUsers();
    return creatorUsers.length > 0;
  }

  getCreatorUsers = async () => {
    const creator = await this.getCreator();
    if(creator !== undefined) {
      return await creator.getUsers();
    }
    return [];
  }

  toVideoDetails = async (): Promise<MinimalVideoDetails> => {
    const creator = await this.getCreator();
    return {
      id: this.platformId,
      platform: this.platform,
      duration: this.length,
      title: this.title,
      url: new URL(this.url),
      nsfw: this.nsfw,
      creator: {
        id: creator.platformId,
        name: creator.name,
        createdAt: creator.createdAt
      }
    }
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
