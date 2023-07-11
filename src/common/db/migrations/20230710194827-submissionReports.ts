import {Migration} from "sequelize-cli";

const migration: Migration = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('VideoSubmissions', 'reports', {
      type: Sequelize.INTEGER.UNSIGNED,
      defaultValue: 0,
      allowNull: false,
    });
    await queryInterface.addColumn('VideoSubmissions', 'reportsTrusted', {
      type: Sequelize.INTEGER.UNSIGNED,
      defaultValue: 0,
      allowNull: false,
    });
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('VideoSubmissions', 'reports');
    await queryInterface.removeColumn('VideoSubmissions', 'reportsTrusted');
  }
}

module.exports = {up: migration.up, down: migration.down};
