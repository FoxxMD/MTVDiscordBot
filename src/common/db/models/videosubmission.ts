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
import {BotClient} from "../../../BotClient.js";
import {Client, TextChannel} from "discord.js";

export class VideoSubmission extends Model<InferAttributes<VideoSubmission>, InferCreationAttributes<VideoSubmission>> {

  declare id: CreationOptional<number>;
  declare messageId: string;
  declare channelId: string;
  declare guildId: ForeignKey<Guild['id']>;
  declare videoId: ForeignKey<Video['id']>;
  declare userId: ForeignKey<User['id']>;
  declare upvotes: CreationOptional<number>;
  declare downvotes: CreationOptional<number>;
  declare url: CreationOptional<string>;
  declare active: boolean;

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

  getDiscordMessage = async (client: Client) => {
      const channel = client.channels.cache.get(this.channelId) as TextChannel;
      return await channel.messages.fetch(this.messageId);
  }
  getDiscordMessageLink = () => {
    return `https://discord.com/channels/${this.guildId}/${this.channelId}/${this.messageId}`
  }

  isOC = async () => {
    const user = await this.getUser();
    const creator = await (await this.getVideo()).getCreator();
    if (creator === undefined) {
      return false;
    }
    const userCreators = await creator.getUsers();
    if (userCreators.length === 0) {
      return false;
    }
    if (userCreators.some(x => x.id === user.id)) {
      return true;
    }
    return false;
  }
}


export const init = (sequelize: Sequelize) => {
  VideoSubmission.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    messageId: DataTypes.STRING,
    channelId: DataTypes.STRING,
    guildId: DataTypes.STRING,
    videoId: DataTypes.INTEGER,
    userId: DataTypes.INTEGER,
    url: DataTypes.STRING,
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    upvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    downvotes: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
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
