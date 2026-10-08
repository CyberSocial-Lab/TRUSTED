"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        await queryInterface.sequelize.query(`
            DO $$
            BEGIN
                CREATE TYPE "enum_hospital_decisions_status"
                AS ENUM (
                    'PENDING',
                    'GRANTED',
                    'DENIED',
                    'REVOKED'
                );
            EXCEPTION
                WHEN duplicate_object THEN NULL;
            END
            $$;
        `);

        await queryInterface.createTable("hospital_decisions", {
            id: {
                type: Sequelize.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },

            studyRequestId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "study_requests",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },

            hospitalId: {
                type: Sequelize.INTEGER,
                allowNull: false,
                references: {
                    model: "hospitals",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT",
            },

            status: {
                type: Sequelize.ENUM("PENDING", "GRANTED", "DENIED", "REVOKED"),
                allowNull: false,
                defaultValue: "PENDING",
            },

            signatureAlgorithm: {
                type: Sequelize.STRING,
                allowNull: true,
            },

            signedPayloadHash: {
                type: Sequelize.TEXT,
                allowNull: true,
            },

            signatureValue: {
                type: Sequelize.TEXT,
                allowNull: true,
            },

            rejectionReason: {
                type: Sequelize.TEXT,
                allowNull: true,
            },

            decidedAt: {
                type: Sequelize.DATE,
                allowNull: true,
            },

            revokedAt: {
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

        await queryInterface.addConstraint("hospital_decisions", {
            fields: ["studyRequestId", "hospitalId"],
            type: "unique",
            name: "hospital_decisions_study_request_hospital_unique",
        });

        await queryInterface.addIndex(
            "hospital_decisions",
            ["studyRequestId"],
            {
                name: "hospital_decisions_study_request_id_idx",
            },
        );

        await queryInterface.addIndex("hospital_decisions", ["hospitalId"], {
            name: "hospital_decisions_hospital_id_idx",
        });

        await queryInterface.addIndex("hospital_decisions", ["status"], {
            name: "hospital_decisions_status_idx",
        });
    },

    async down(queryInterface) {
        await queryInterface.dropTable("hospital_decisions");

        await queryInterface.sequelize.query(`
            DROP TYPE IF EXISTS "enum_hospital_decisions_status";
        `);
    },
};
