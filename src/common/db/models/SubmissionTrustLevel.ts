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
import dayjs, {Dayjs} from "dayjs";

export class SubmissionTrustLevel extends Model<InferAttributes<SubmissionTrustLevel>, InferCreationAttributes<SubmissionTrustLevel>> {

  declare id: CreationOptional<number>;
  declare acceptableSubmissionsThreshold: number;
  declare name: string;
  declare allowedSubmissions: number
  declare timePeriod: number
  declare description: CreationOptional<string>;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  isRateLimited = (date: Date) => {
    //return Math.abs(dayjs().diff(dayjs(date), 'seconds')) < this.timePeriod;
    return this.limitRemaining(date) > 0;
  }

  limitRemaining = (date: Date) => {
    const timeRemaining = this.timePeriod - Math.abs(dayjs().diff(dayjs(date), 'seconds'));

    return Math.max(timeRemaining, 0);
  }
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
