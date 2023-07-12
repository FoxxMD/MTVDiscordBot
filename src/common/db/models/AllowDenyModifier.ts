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
  ForeignKey,
  BelongsToSetAssociationMixin, BelongsToGetAssociationMixin, Op
} from "sequelize";
import {User} from "./user.js";
import {AllowDenyType} from "../../infrastructure/Atomic.js";

export class AllowDenyModifier extends Model<InferAttributes<AllowDenyModifier>, InferCreationAttributes<AllowDenyModifier>> {

  declare id: CreationOptional<number>;
  declare flag: AllowDenyType;
  declare createdById: ForeignKey<User['id']>;
  declare modifiedThingId: number;
  declare modifiedThingType: string;
  declare reason?: CreationOptional<string>;
  declare expiresAt?: CreationOptional<Date>

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare createdBy?: NonAttribute<User>;

  declare getCreatedBy: BelongsToGetAssociationMixin<User>;
  declare setCreatedBy: BelongsToSetAssociationMixin<User, number>
}

export const init = (sequelize: Sequelize) => {
  AllowDenyModifier.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    flag: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    modifiedThingId: DataTypes.INTEGER.UNSIGNED,
    modifiedThingType: DataTypes.STRING,
    createdById: DataTypes.INTEGER.UNSIGNED,
    reason: DataTypes.STRING,
    expiresAt: DataTypes.DATE,
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'AllowDenyModifiers',
    whereMergeStrategy: 'and',
    scopes: {
      active: {
        where: {
          [Op.or]: [
            {
              expiresAt: {
                [Op.is]: null
              }
            },
            {
              expiresAt: {
                [Op.lt]: new Date()
              }
            }
          ]
        }
      }
    }
  });
}

export const associate = () => {
  AllowDenyModifier.belongsTo(User, {targetKey: 'id', as: 'user', foreignKey: 'createdById'});
}

export interface AllowDenyModifierData {
  flag: AllowDenyType
  createdById?: number
  reason?: string
  expiresAt?: Date
}
