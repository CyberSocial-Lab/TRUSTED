"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable(
            "researchers",
            {
                id: {
                    type: Sequelize.INTEGER,
                    autoIncrement: true,
                    primaryKey: true,
                    allowNull: false,
                },

                externalId: {
                    type: Sequelize.STRING,
                    allowNull: false,
                    unique: true,
                },

                name: {
                    type: Sequelize.STRING,
                    allowNull: false,
                },

                email: {
                    type: Sequelize.STRING,
                    allowNull: false,
                    unique: true,
                },

                role: {
                    type: Sequelize.STRING,
                    allowNull: true,
                },

                organisation: {
                    type: Sequelize.STRING,
                    allowNull: false,
                },

                status: {
                    type: Sequelize.ENUM("ACTIVE", "INACTIVE"),
                    allowNull: false,
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
            },

            {},
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.dropTable("researchers");
    },
};
