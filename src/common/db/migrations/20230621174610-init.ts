import {Migration} from "sequelize-cli";
import {IndexType} from "sequelize/types/dialects/abstract/query-interface.js";

const migration: Migration = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable('Users', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
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

        await queryInterface.addIndex('Users', ['name'], {type: 'UNIQUE'});

        await queryInterface.createTable('VideoSubmissions', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            messageId: {
                type: Sequelize.STRING
            },
            videoId: {
                type: Sequelize.INTEGER
            },
            guildId: {
                type: Sequelize.STRING
            },
            userId: {
                type: Sequelize.INTEGER.UNSIGNED
            },
            upvotes: {
                type: Sequelize.INTEGER.UNSIGNED
            },
            downvotes: {
                type: Sequelize.INTEGER.UNSIGNED
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

        await queryInterface.createTable('Videos', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            platform: {
                type: Sequelize.STRING
            },
            creatorName: {
                type: Sequelize.STRING
            },
            creatorId: {
                type: Sequelize.STRING
            },
            platformId: {
                type: Sequelize.STRING
            },
            length: {
                type: Sequelize.INTEGER.UNSIGNED
            },
            nsfw: {
                type: Sequelize.BOOLEAN
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

        await queryInterface.addIndex('Videos', ['platform','platformId'], {type: 'UNIQUE'});
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Users');
        await queryInterface.dropTable('VideoSubmissions');
        await queryInterface.dropTable('Videos');
    }
};
module.exports = { up: migration.up, down: migration.down };
