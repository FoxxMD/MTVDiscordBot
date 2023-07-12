import {
    Model,
    InferAttributes,
    InferCreationAttributes,
    CreationOptional,
    DataTypes,
    Sequelize,
    ForeignKey,
    NonAttribute,
    BelongsToGetAssociationMixin,
    HasOneGetAssociationMixin,
    HasOneCreateAssociationMixin,
    Association, HasOneSetAssociationMixin
} from 'sequelize';
import {Video} from "./video.js";
import {User} from "./user.js";
import {ShowcasePost} from "./ShowcasePost.js";
import {Guild} from "./Guild.js";
import {BotClient} from "../../../BotClient.js";
import {Client, TextChannel, time, userMention} from "discord.js";
import {durationToTimestamp} from "../../../utils/StringUtils.js";
import dayjs from "dayjs";
import {commaListsAnd} from "common-tags";
import {DiscordMessageInfo} from "./DiscordMessageInfo.js";

export interface VideoSubmissionSummaryOptions {
  showOC?: boolean
  linkVideo?: boolean
  showVideo?: Boolean
  showDiscord?: boolean
  showCreator?: boolean
}

export interface ChannelSummaryOptions {
    showVoting?: boolean
    userSnowflake?: string
}


export class VideoSubmission extends Model<InferAttributes<VideoSubmission>, InferCreationAttributes<VideoSubmission>> {

  declare id: CreationOptional<number>;
  declare messageInfoId: ForeignKey<DiscordMessageInfo['id']>;
  declare guildId: ForeignKey<Guild['id']>;
  declare videoId: ForeignKey<Video['id']>;
  declare userId: ForeignKey<User['id']>;
  declare upvotes: CreationOptional<number>;
  declare downvotes: CreationOptional<number>;
  declare reports: CreationOptional<number>;
  declare reportsTrusted: CreationOptional<number>;
  declare url: CreationOptional<string>;
  declare active: boolean;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getVideo: BelongsToGetAssociationMixin<Video>;
  declare getUser: BelongsToGetAssociationMixin<User>;
  declare getGuild: BelongsToGetAssociationMixin<Guild>;
  declare getShowcase: HasOneGetAssociationMixin<Video>;

  declare getMessage: HasOneGetAssociationMixin<DiscordMessageInfo>;
  declare createMessage: HasOneCreateAssociationMixin<DiscordMessageInfo>;
  declare setMessage: HasOneSetAssociationMixin<DiscordMessageInfo, number>;

  declare guild: NonAttribute<Guild>
  declare user: NonAttribute<User>;
  declare video: NonAttribute<Video>;
  declare showcase?: NonAttribute<ShowcasePost>
  declare message: NonAttribute<DiscordMessageInfo>

    declare static associations: {
      message: Association<VideoSubmission, DiscordMessageInfo>
    }

    getDiscordMessage = async (client: Client) => {
        const msgInfo = await this.getMessage();
        return await msgInfo.getDiscordMessage(client);
    }
    getDiscordMessageLink = async () => {
        const msgInfo = await this.getMessage();
        return msgInfo.getLink();
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

    summary = async (options?: VideoSubmissionSummaryOptions) => {
        const {
            showOC = true,
            linkVideo = false,
            showVideo = false,
            showDiscord = false,
            showCreator = true
        } = options || {};
        const parts: string[] = [];
        if (showOC) {
            const oc = await this.isOC();
            if (oc) {
                parts.push('[OC]');
            }
        }
        const video = await this.getVideo();
        let title = video.title;
        if (linkVideo) {
            title = `[${title}](${video.url})`;
        }
        parts.push(title);
        if (showCreator) {
            const creator = await video.getCreator();
            parts.push(`By ${creator.name}`);
        }

        if (showVideo) {
            parts.push(video.url);
        }

        if (showDiscord) {
            parts.push(await this.getDiscordMessageLink());
        }

        return parts.join(' ');
    }

    toChannelSummary = async (options?: ChannelSummaryOptions) => {

      const {
          userSnowflake,
          showVoting = false,
      } = options || {};

        const videoEntity = await this.getVideo();
        const title = `**${videoEntity.title}** [${durationToTimestamp(dayjs.duration({seconds: videoEntity.length}))}]`;
        const detailParts: string[] = [];
        const creator = await videoEntity.getCreator();
        if (creator !== undefined) {
            let creatorStr = `Creator: _${creator.name}_`;
            const creatorUsers = await creator.getUsers();
            if (creatorUsers.length > 0) {
                creatorStr = `${creatorStr} (${commaListsAnd`${creatorUsers.map(x => userMention(x.discordId))}`})`;
            }
            detailParts.push(creatorStr);
        }
        let snowflake: string = userSnowflake;
        if(snowflake === undefined) {
            const user = await this.getUser();
            if(user !== undefined) {
                snowflake = user.discordId;
            }
        }
        detailParts.push(`Submitted By: <@${snowflake}>`)
        detailParts.push(`Link: ${videoEntity.url}`);
        if(showVoting) {
            if(this.active) {
                const createdAt = this.createdAt !== undefined ? dayjs(this.createdAt) : dayjs();
                detailParts.push(`Voting Active: **Yes** (Until ${time(createdAt.add(24, 'hours').toDate())})`)
            } else {
                detailParts.push(`Voting Active: **No**`);
            }
        }

        return `${title}\n${detailParts.map(x => `* ${x}`).join('\n')}`;
    }
}


export const init = (sequelize: Sequelize) => {
  VideoSubmission.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    messageInfoId: DataTypes.INTEGER.UNSIGNED,
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
    reports: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    },
    reportsTrusted: {
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
  VideoSubmission.belongsTo(Guild, {targetKey: 'id', as: 'guild'});
  VideoSubmission.belongsTo(User, {targetKey: 'id', as: 'user'});
  VideoSubmission.belongsTo(Video, {targetKey: 'id', as: 'video'});
  VideoSubmission.hasOne(ShowcasePost, {foreignKey: 'submissionId', as: 'showcase'});
  VideoSubmission.hasOne(DiscordMessageInfo, {
      foreignKey: 'id',
      sourceKey: 'messageInfoId',
      onDelete: 'CASCADE',
      as: 'message',
      foreignKeyConstraint: true
  });
}
