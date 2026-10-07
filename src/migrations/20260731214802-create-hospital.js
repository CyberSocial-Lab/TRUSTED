"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("hospitals", {
            id: {
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
                type: Sequelize.INTEGER,
            },

            name: {
                allowNull: false,
                type: Sequelize.STRING,
            },

            country: {
                allowNull: false,
                type: Sequelize.STRING(2),
            },

            organizationId: {
                allowNull: false,
                unique: true,
                type: Sequelize.STRING,
            },
            webhookUrl: {
                type: Sequelize.STRING,
                allowNull: true,
            },
            status: {
                allowNull: false,
                type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
                defaultValue: "ACTIVE",
            },

            publicKeyId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                unique: true,
                references: {
                    model: "public_keys",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT",
            },

            createdAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },

            updatedAt: {
                allowNull: false,
                type: Sequelize.DATE,
                defaultValue: Sequelize.literal("CURRENT_TIMESTAMP"),
            },
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("hospitals");

        await queryInterface.sequelize.query(
            'DROP TYPE IF EXISTS "enum_hospitals_status";',
        );
    },
};
