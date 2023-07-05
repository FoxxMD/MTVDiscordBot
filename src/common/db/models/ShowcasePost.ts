import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
  Sequelize,
  ForeignKey, NonAttribute, BelongsToGetAssociationMixin
} from 'sequelize';
import {Video} from "./video.js";
import {User} from "./user.js";
import {VideoSubmission} from "./videosubmission.js";
import {Guild} from "./Guild.js";

export class ShowcasePost extends Model<InferAttributes<ShowcasePost>, InferCreationAttributes<ShowcasePost>> {

  declare id: CreationOptional<number>;
  declare messageId: string;
  declare channelId: string;
  declare guildId: ForeignKey<Guild['id']>;
  declare videoId: ForeignKey<Video['id']>;
  declare userId: ForeignKey<User['id']>;
  declare submissionId: ForeignKey<VideoSubmission['id']>;
  declare url: CreationOptional<string>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getVideo: BelongsToGetAssociationMixin<Video>;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare getGuild: BelongsToGetAssociationMixin<Guild>;
  declare getSubmission: BelongsToGetAssociationMixin<VideoSubmission>;

  declare guild: NonAttribute<Guild>;
  declare user: NonAttribute<User>;
  declare video: NonAttribute<Video>;
  declare submission?: NonAttribute<VideoSubmission>
}


export const init = (sequelize: Sequelize) => {
  ShowcasePost.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    channelId: DataTypes.STRING,
    messageId: DataTypes.STRING,
    guildId: DataTypes.STRING,
    videoId: DataTypes.INTEGER,
    submissionId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER,
    url: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'ShowcasePost',
    indexes: [
      {
        unique: false,
        fields: ['videoId']
      },
      {
        unique: true,
        fields: ['videoId', 'guildId', 'messageId', 'userId']
      },
      {
        unique: false,
        fields: ['url'],
      }
    ]
  });
}

export const associate = () => {
  ShowcasePost.belongsTo(Video, {targetKey: 'id', as: 'video'});
  ShowcasePost.belongsTo(User, {targetKey: 'id', as: 'user'});
  ShowcasePost.belongsTo(Guild, {targetKey: 'id', as: 'guild'});
  ShowcasePost.belongsTo(VideoSubmission, {targetKey: 'id', as: 'submission'});
}
