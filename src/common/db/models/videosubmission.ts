import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
  Sequelize,
  ForeignKey, NonAttribute, BelongsToGetAssociationMixin, HasOneGetAssociationMixin
} from 'sequelize';
import {Video} from "./video.js";
import {User} from "./user.js";
import {ShowcasePost} from "./ShowcasePost.js";
import {Guild} from "./Guild.js";

export class VideoSubmission extends Model<InferAttributes<VideoSubmission>, InferCreationAttributes<VideoSubmission>> {

  declare id: CreationOptional<number>;
  declare messageId: string;
  declare guildId: ForeignKey<Guild['id']>;
  declare videoId: ForeignKey<Video['id']>;
  declare userId: ForeignKey<User['id']>;
  declare upvotes: CreationOptional<number>;
  declare downvotes: CreationOptional<number>;
  declare url: CreationOptional<string>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getVideo: BelongsToGetAssociationMixin<Video>;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare getGuild: BelongsToGetAssociationMixin<Guild>;
  declare getShowcase: HasOneGetAssociationMixin<Video>;

  declare guild: NonAttribute<Guild>
  declare user: NonAttribute<User>;
  declare video: NonAttribute<Video>;
  declare showcase?: NonAttribute<ShowcasePost>
}


export const init = (sequelize: Sequelize) => {
  VideoSubmission.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    messageId: DataTypes.STRING,
    guildId: DataTypes.STRING,
    videoId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER,
    url: DataTypes.STRING,
    upvotes: DataTypes.INTEGER,
    downvotes: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'VideoSubmission',
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
  VideoSubmission.belongsTo(Video, {targetKey: 'id', as: 'guild'});
  VideoSubmission.belongsTo(User, {targetKey: 'id', as: 'user'});
  VideoSubmission.belongsTo(Guild, {targetKey: 'id', as: 'video'});
  VideoSubmission.hasOne(ShowcasePost, {foreignKey: 'submissionId', as: 'showcase'});
}
