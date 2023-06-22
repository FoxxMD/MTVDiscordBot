import {Migration} from "sequelize-cli";

const migration: Migration = {
  async up(queryInterface, Sequelize) {
    await queryInterface.bulkInsert('SubmissionTrustLevels', [
      {acceptableSubmissionsThreshold: 0, name: 'Water', allowedSubmissions: 1, timePeriod: 86400, createdAt: new Date(), updatedAt: new Date()},
      {acceptableSubmissionsThreshold: 3, name: 'Appetizer', allowedSubmissions: 2, timePeriod: 86400, createdAt: new Date(), updatedAt: new Date()},
      {acceptableSubmissionsThreshold: 5, name: 'Main Course', allowedSubmissions: 3, timePeriod: 86400, createdAt: new Date(), updatedAt: new Date()},
      {acceptableSubmissionsThreshold: 7, name: 'Mukbang Enjoyer', allowedSubmissions: 5, timePeriod: 86400, createdAt: new Date(), updatedAt: new Date()},
      {acceptableSubmissionsThreshold: 10, name: 'Chef', allowedSubmissions: 5, timePeriod: 86400, createdAt: new Date(), updatedAt: new Date()}
    ]);
  },
  async down(queryInterface, Sequelize) {
    // @ts-ignore
    queryInterface.bulkDelete('SubmissionTrustLevels', {}, {truncate: true});
  }
}

module.exports = {up: migration.up, down: migration.down};
