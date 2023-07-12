import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
  Sequelize,
  ForeignKey, NonAttribute, BelongsToGetAssociationMixin, HasOneGetAssociationMixin, HasOneCreateAssociationMixin
} from 'sequelize';
import {Video} from "./video.js";
import {User} from "./user.js";
import {VideoSubmission} from "./videosubmission.js";
import {Guild} from "./Guild.js";
import {Client, TextChannel} from "discord.js";
import {DiscordMessageInfo} from "./DiscordMessageInfo.js";

export class ShowcasePost extends Model<InferAttributes<ShowcasePost>, InferCreationAttributes<ShowcasePost>> {

  declare id: CreationOptional<number>;
  declare messageInfoId: ForeignKey<DiscordMessageInfo['id']>;
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

  declare getMessage: HasOneGetAssociationMixin<DiscordMessageInfo>
  declare createMessage: HasOneCreateAssociationMixin<DiscordMessageInfo>

  declare guild: NonAttribute<Guild>;
  declare user: NonAttribute<User>;
  declare video: NonAttribute<Video>;
  declare submission?: NonAttribute<VideoSubmission>
  declare message: NonAttribute<DiscordMessageInfo>

  getDiscordMessage = async (client: Client) => {
    const msgInfo = await this.getMessage();
    return await msgInfo.getDiscordMessage(client);
  }
  getDiscordMessageLink = async () => {
    const msgInfo = await this.getMessage();
    return msgInfo.getLink();
  }
}


export const init = (sequelize: Sequelize) => {
  ShowcasePost.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    messageInfoId: DataTypes.INTEGER.UNSIGNED,
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
        fields: ['videoId', 'guildId', 'messageInfoId', 'userId']
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
  ShowcasePost.hasOne(DiscordMessageInfo, {
    foreignKey: 'id',
    sourceKey: 'messageInfoId',
    onDelete: 'CASCADE',
    foreignKeyConstraint: true,
    as: 'message'
  });
}
