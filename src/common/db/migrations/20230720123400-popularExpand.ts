import {Migration} from "sequelize-cli";
import {Creator} from "../models/creator.js";

const migration: Migration = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Creators', 'popular', {
      type: Sequelize.INTEGER
    });
    await queryInterface.update(new Creator(), 'Creators', {popular: null}, {});
  },
  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn('Creators', 'popular', {
      type: Sequelize.BOOLEAN
    });
  }
}

module.exports = {up: migration.up, down: migration.down};
