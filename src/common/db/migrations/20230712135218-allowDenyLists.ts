import {Migration} from "sequelize-cli";

const migration: Migration = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('AllowDenyModifiers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER.UNSIGNED
      },
      flag: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdById: {
        type: Sequelize.INTEGER.UNSIGNED
      },
      modifiedThingId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
      },
      modifiedThingType: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      reason: {
        type: Sequelize.STRING
      },
      expiresAt: {
        allowNull: true,
        type: Sequelize.DATE
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
    await queryInterface.addIndex('AllowDenyModifiers', ['modifiedThingId']);
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('AllowDenyModifiers');
  }
}

module.exports = {up: migration.up, down: migration.down};
