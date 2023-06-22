import {
  Model,
  InferAttributes,
  InferCreationAttributes,
  CreationOptional,
  Sequelize,
  DataTypes,
  NonAttribute,
  Association,
  HasManyGetAssociationsMixin,
  HasManyAddAssociationMixin,
  HasManyRemoveAssociationMixin,
  HasManyCreateAssociationMixin,
  BelongsToManyAddAssociationMixin,
  BelongsToManyCreateAssociationMixin,
  BelongsToManyGetAssociationsMixin,
  HasOneCreateAssociationMixin,
  HasOneGetAssociationMixin,
  HasOneSetAssociationMixin
} from 'sequelize';
import {VideoSubmission} from "./videosubmission.js";
import {Creator} from "./creator.js";
import {UserTrustLevel} from "./UserTrustLevel.js";

export class User extends Model<InferAttributes<User, { omit: 'submissions' | 'creators' | 'trustLevel' }>, InferCreationAttributes<User, { omit: 'submissions' | 'creators' | 'trustLevel' }>> {

  declare id: CreationOptional<number>;
  declare name: string;

  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  declare getSubmissions: HasManyGetAssociationsMixin<VideoSubmission>;
  declare addSubmission: HasManyAddAssociationMixin<VideoSubmission, number>;
  declare removeSubmission: HasManyRemoveAssociationMixin<VideoSubmission, number>;
  declare createSubmission: HasManyCreateAssociationMixin<VideoSubmission, 'userId'>;

  declare createCreator: BelongsToManyCreateAssociationMixin<Creator>;
  declare addCreator: BelongsToManyAddAssociationMixin<Creator, 'CreatorId'>;
  declare getCreators: BelongsToManyGetAssociationsMixin<Creator>;

  declare getTrustLevel: HasOneGetAssociationMixin<UserTrustLevel>;
  declare createTrustLevel: HasOneCreateAssociationMixin<UserTrustLevel>;
  // declare setTrustLevel: HasOneSetAssociationMixin<UserTrustLevel, 'id'>;

  declare submissions?: NonAttribute<VideoSubmission[]>;
  declare creators?: NonAttribute<Creator[]>;
  declare trustLevel?: NonAttribute<UserTrustLevel>;

  declare static associations: {
    submissions: Association<User, VideoSubmission>;
    creators: Association<User, Creator>
    trustLevel: Association<User, UserTrustLevel>
  };
}

export const init = (sequelize: Sequelize) => {
  User.init({
    id: {
      type: DataTypes.INTEGER.UNSIGNED,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    createdAt: DataTypes.DATE,
    updatedAt: DataTypes.DATE,
  }, {
    sequelize,
    modelName: 'User',
    indexes: [
      {
        unique: true,
        fields: ['name']
      }
    ]
  });
}

export const associate = () => {
  User.hasMany(VideoSubmission, {
    sourceKey: 'id',
    foreignKey: 'userId',
    as: 'submissions'
  });
  User.belongsToMany(Creator, {through: 'UserCreators'});
  User.hasOne(UserTrustLevel, {foreignKey: 'userId', as: 'trustLevel'});
}

// module.exports = (sequelize, DataTypes) => {
//   class User extends Model<InferAttributes<User>, InferCreationAttributes<User>> {
//
//     declare id: CreationOptional<number>;
//     declare name: string;
//
//     declare createdAt: CreationOptional<Date>;
//     declare updatedAt: CreationOptional<Date>;
//
//     /**
//      * Helper method for defining associations.
//      * This method is not a part of Sequelize lifecycle.
//      * The `models/index` file will call this method automatically.
//      */
//     static associate(models) {
//       // define association here
//     }
//   }
//   User.init({
//     id: {
//       type: DataTypes.INTEGER.UNSIGNED,
//       autoIncrement: true,
//       primaryKey: true
//     },
//     name: {
//       type: DataTypes.STRING,
//       allowNull: false,
//       unique: true
//     },
//     createdAt: DataTypes.DATE,
//     updatedAt: DataTypes.DATE,
//   }, {
//     sequelize,
//     modelName: 'User',
//     indexes: [
//       {
//         unique: true,
//         fields: ['name']
//       }
//     ]
//   });
//   return User;
// };
