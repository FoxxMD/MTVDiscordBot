'use strict';
import {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
  CreationOptional,
  Association,
  Model,
  NonAttribute, ForeignKey
} from "sequelize";
import {Creator} from "./creator.js";
import {User} from "./user.js";
import {SubmissionTrustLevel} from "./SubmissionTrustLevel.js";

export class UserTrustLevel extends Model<InferAttributes<UserTrustLevel>, InferCreationAttributes<UserTrustLevel>> {

  declare id: CreationOptional<number>;
  declare givenById: ForeignKey<Creator['id']>;
  declare trustLevelId: ForeignKey<Creator['id']>;
  declare userId: ForeignKey<Creator['id']>;

  declare user?: NonAttribute<User>;
  declare givenBy?: NonAttribute<User>;
  declare level?: NonAttribute<SubmissionTrustLevel>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

}

export const init = (sequelize: Sequelize) => {
  UserTrustLevel.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    givenById: DataTypes.INTEGER,
    userId: DataTypes.INTEGER,
    trustLevelId: DataTypes.INTEGER,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'UserTrustLevel',
  });
}

export const associate = () => {
  UserTrustLevel.belongsTo(User, {as: 'user', foreignKey: 'userId'});
  UserTrustLevel.belongsTo(User, {as: 'givenBy', foreignKey: 'givenById'});
  UserTrustLevel.belongsTo(SubmissionTrustLevel, {as: 'level', targetKey: 'id', foreignKey: 'trustLevelId'});
}
