"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.createTable("study_requests", {
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },

            requestId: {
                type: Sequelize.STRING,
                allowNull: false,
                unique: true,
            },

            studyId: {
                type: Sequelize.STRING,
                allowNull: false,
            },

            formType: {
                type: Sequelize.ENUM("DATA_REQUEST", "DATA_ACCESS_APPLICATION"),
                allowNull: false,
            },

            title: {
                type: Sequelize.STRING,
                allowNull: false,
            },

            language: {
                type: Sequelize.STRING(2),
                allowNull: false,
            },

            status: {
                type: Sequelize.ENUM(
                    "PENDING",
                    "APPROVED",
                    "REJECTED",
                    "EXPIRED",
                ),
                allowNull: false,
                defaultValue: "PENDING",
            },

            dataPortalId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "dataPortals",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT",
            },

            requestPayload: {
                type: Sequelize.JSONB,
                allowNull: false,
            },

            signatureAlgorithm: {
                type: Sequelize.STRING,
                allowNull: false,
            },

            signedPayloadHash: {
                type: Sequelize.TEXT,
                allowNull: false,
            },

            signatureValue: {
                type: Sequelize.TEXT,
                allowNull: false,
            },

            signedAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },

            submittedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn("NOW"),
            },

            expiresAt: {
                type: Sequelize.DATE,
                allowNull: false,
            },

            resolvedAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },

            createdAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn("NOW"),
            },

            updatedAt: {
                type: Sequelize.DATE,
                allowNull: false,
                defaultValue: Sequelize.fn("NOW"),
            },
        });

        await queryInterface.addIndex("study_requests", ["studyId"], {
            name: "study_requests_study_id_idx",
        });

        await queryInterface.addIndex("study_requests", ["dataPortalId"], {
            name: "study_requests_dataPortal_id_idx",
        });

        await queryInterface.addIndex("study_requests", ["status"], {
            name: "study_requests_status_idx",
        });

        await queryInterface.addIndex("study_requests", ["expiresAt"], {
            name: "study_requests_expires_at_idx",
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("study_requests");

        // PostgreSQL può conservare i tipi ENUM dopo il drop della tabella.
        await queryInterface.sequelize.query(
            'DROP TYPE IF EXISTS "enum_study_requests_formType";',
        );

        await queryInterface.sequelize.query(
            'DROP TYPE IF EXISTS "enum_study_requests_status";',
        );
    },
};
