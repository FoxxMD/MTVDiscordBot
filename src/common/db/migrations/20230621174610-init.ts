import {Migration} from "sequelize-cli";
import {IndexType} from "sequelize/types/dialects/abstract/query-interface.js";

const migration: Migration = {
    async up(queryInterface, Sequelize) {

        await queryInterface.createTable('Guilds', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            snowflake: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true
            },
            name: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: false
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

        await queryInterface.addIndex('Guilds', ['snowflake'], {type: 'UNIQUE'});

        await queryInterface.createTable('Users', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER
            },
            guildId: {
                type: Sequelize.INTEGER.UNSIGNED
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

        await queryInterface.addIndex('Users', ['name', 'guildId'], {type: 'UNIQUE'});

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
                type: Sequelize.INTEGER.UNSIGNED
            },
            userId: {
                type: Sequelize.INTEGER.UNSIGNED
            },
            url: {
                type: Sequelize.STRING
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

        await queryInterface.addIndex('VideoSubmissions', ['videoId', 'guildId', 'messageId', 'userId'], {type: 'UNIQUE'});
        await queryInterface.addIndex('VideoSubmissions', ['url']);
        await queryInterface.addIndex('VideoSubmissions', ['videoId']);

        await queryInterface.createTable('Videos', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            creatorId: {
                type: Sequelize.INTEGER.UNSIGNED
            },
            platform: {
                type: Sequelize.STRING
            },
            platformId: {
                type: Sequelize.STRING
            },
            url: {
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

        await queryInterface.addIndex('Videos', ['platform', 'platformId'], {type: 'UNIQUE'});
        await queryInterface.addIndex('Videos', ['url']);

        await queryInterface.createTable('Creators', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            platform: {
                type: Sequelize.STRING
            },
            name: {
                type: Sequelize.STRING
            },
            platformId: {
                type: Sequelize.STRING
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

        await queryInterface.createTable('ShowcasePosts', {
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
                type: Sequelize.INTEGER.UNSIGNED
            },
            userId: {
                type: Sequelize.INTEGER.UNSIGNED
            },
            submissionId: {
                type: Sequelize.INTEGER.UNSIGNED
            },
            url: {
                type: Sequelize.STRING
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

        await queryInterface.addIndex('ShowcasePosts', ['videoId', 'guildId', 'messageId', 'userId'], {type: 'UNIQUE'});
        await queryInterface.addIndex('ShowcasePosts', ['url']);
        await queryInterface.addIndex('ShowcasePosts', ['videoId']);

        await queryInterface.addIndex('Creators', ['platform', 'platformId'], {type: 'UNIQUE'});

        await queryInterface.createTable('UserCreators', {
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            UserId: {
                allowNull: false,
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
                references: {
                    model: 'Users',
                    key: 'id'
                },
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            CreatorId: {
                allowNull: false,
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
                references: {
                    model: 'Creators',
                    key: 'id'
                },
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
        });

        await queryInterface.createTable('SubmissionTrustLevels', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            acceptableSubmissionsThreshold: {
                type: Sequelize.INTEGER.UNSIGNED
            },
            name: {
                type: Sequelize.STRING
            },
            allowedSubmissions: {
                type: Sequelize.INTEGER.UNSIGNED
            },
            timePeriod: {
                type: Sequelize.INTEGER.UNSIGNED
            },
            description: {
                type: Sequelize.STRING
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
        });

        await queryInterface.createTable('UserTrustLevels', {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER.UNSIGNED
            },
            userId: {
                allowNull: false,
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
                references: {
                    model: 'Users',
                    key: 'id'
                },
                type: Sequelize.INTEGER.UNSIGNED
            },
            givenById: {
                allowNull: true,
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
                references: {
                    model: 'Users',
                    key: 'id'
                },
                type: Sequelize.INTEGER.UNSIGNED
            },
            trustLevelId: {
                allowNull: false,
                onDelete: 'RESTRICT',
                onUpdate: 'CASCADE',
                references: {
                    model: 'SubmissionTrustLevels',
                    key: 'id'
                },
                type: Sequelize.INTEGER.UNSIGNED
            },
            createdAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE
            },
        });
        await queryInterface.addIndex('UserTrustLevels', ['userId'], {type: 'UNIQUE'});
    },
    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable('Guilds');
        await queryInterface.dropTable('Users');
        await queryInterface.dropTable('VideoSubmissions');
        await queryInterface.dropTable('Videos');
        await queryInterface.dropTable('ShowcasePosts');
        await queryInterface.dropTable('Creators');
        await queryInterface.dropTable('UserCreators');
        await queryInterface.dropTable('SubmissionTrustLevels');
        await queryInterface.dropTable('UserTrustLevels');
    }
};
module.exports = {up: migration.up, down: migration.down};
