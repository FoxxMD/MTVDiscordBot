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
import {Guild} from "./Guild.js";
import {SpecialRoleType} from "../../infrastructure/Atomic.js";

export class SpecialRole extends Model<InferAttributes<SpecialRole>, InferCreationAttributes<SpecialRole>> {

  declare id: CreationOptional<number>;
  declare roleType: SpecialRoleType;
  declare discordRoleName: string;
  declare discordRoleId: string;
  declare guildId: ForeignKey<Guild['id']>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const init = (sequelize: Sequelize) => {
  SpecialRole.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    roleType: DataTypes.STRING,
    discordRoleName: DataTypes.INTEGER,
    discordRoleId: DataTypes.STRING,
    guildId: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'SpecialRole',
  });
}

export const associate = () => {
  SpecialRole.belongsTo(Guild, {targetKey: 'id', as: 'guild'});
}

export const ROLE_TYPES = {
  APPROVED: 'approved' as SpecialRoleType,
  JANITOR: 'janitor' as SpecialRoleType
}
