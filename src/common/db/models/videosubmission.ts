import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  DataTypes,
  Sequelize,
  ForeignKey, NonAttribute
} from 'sequelize';
import {Video} from "./video.js";
import {User} from "./user.js";

export class VideoSubmission extends Model<InferAttributes<VideoSubmission>, InferCreationAttributes<VideoSubmission>> {

  declare id: CreationOptional<number>;
  declare messageId: string;
  declare guildId: string;
  declare videoId: ForeignKey<Video['id']>;
  declare userId: ForeignKey<User['id']>;
  declare upvotes: CreationOptional<number>;
  declare downvotes: CreationOptional<number>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare user?: NonAttribute<User>;
  declare video?: NonAttribute<Video>;
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
      }
    ]
  });
}

export const associate = () => {
  VideoSubmission.belongsTo(Video, {targetKey: 'id'});
  VideoSubmission.belongsTo(User, {targetKey: 'id'})
}

// module.exports = (sequelize, DataTypes) => {
//
//   return VideoSubmission;
// };
