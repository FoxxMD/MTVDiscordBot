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
} from "sequelize";
import {Guild} from "./Guild.js";
import {Client, TextChannel} from "discord.js";
import {buildDiscordMessageLink} from "../../../utils/StringUtils.js";

export class DiscordMessageInfo extends Model<InferAttributes<DiscordMessageInfo>, InferCreationAttributes<DiscordMessageInfo>> {

  declare id: CreationOptional<number>;
  declare messageId: string;
  declare channelId: string;
  declare guildId: ForeignKey<Guild['id']>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  getDiscordMessage = async (client: Client) => {
    const channel = client.channels.cache.get(this.channelId) as TextChannel;
    return await channel.messages.fetch(this.messageId);
  }

  getLink = () => {
    return buildDiscordMessageLink(this.guildId, this.channelId, this.messageId);
  }
}

export const init = (sequelize: Sequelize) => {
  DiscordMessageInfo.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    channelId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    messageId: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    guildId: {
      type: DataTypes.STRING,
      allowNull: false
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'DiscordMessageInfo',
  });
}

export const associate = () => {
  DiscordMessageInfo.belongsTo(Guild, {targetKey: 'id', as: 'guild'});
}
