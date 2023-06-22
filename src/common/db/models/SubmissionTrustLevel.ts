'use strict';
import {
  InferAttributes,
  InferCreationAttributes,
  Sequelize,
  DataTypes,
  CreationOptional,
  Association,
  Model,
  NonAttribute, HasManyGetAssociationsMixin, HasManyAddAssociationMixin, HasManyRemoveAssociationMixin, ForeignKey
} from "sequelize";
import {VideoSubmission} from "./videosubmission.js";
import {Creator} from "./creator.js";
import {User} from "./user.js";

export class SubmissionTrustLevel extends Model<InferAttributes<SubmissionTrustLevel>, InferCreationAttributes<SubmissionTrustLevel>> {

  declare id: CreationOptional<number>;
  declare acceptableSubmissionsThreshold: number;
  declare name: string;
  declare allowedSubmissions: number
  declare timePeriod: number
  declare description: CreationOptional<string>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export const init = (sequelize: Sequelize) => {
  SubmissionTrustLevel.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    acceptableSubmissionsThreshold: DataTypes.INTEGER,
    name: DataTypes.STRING,
    allowedSubmissions: DataTypes.INTEGER,
    timePeriod: DataTypes.INTEGER,
    description: DataTypes.STRING,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'SubmissionTrustLevel',
  });
}

export const associate = () => {

}
