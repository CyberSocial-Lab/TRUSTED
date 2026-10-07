"use strict";

/**
 * HospitalDecision
 *
 * Represents the decision made by a hospital regarding a StudyRequest.
 *
 * A StudyRequest can involve multiple hospitals, while each hospital can
 * participate in multiple study requests.
 *
 * Relationship:
 *
 * StudyRequest 1 --- N HospitalDecision N --- 1 Hospital
 *
 * Lifecycle:
 *
 * PENDING -> the hospital has not answered yet
 * GRANTED -> the hospital granted consent for the study request
 * DENIED  -> the hospital denied consent for the study request
 * REVOKED -> the hospital previously granted consent and later revoked it
 */
module.exports = (sequelize, DataTypes) => {
    const HospitalDecision = sequelize.define(
        "HospitalDecision",
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                autoIncrement: true,
                primaryKey: true,
            },

            /**
             * Study request evaluated by the hospital.
             */
            studyRequestId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "study_requests",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "CASCADE",
            },

            /**
             * Hospital required to make the decision.
             */
            hospitalId: {
                type: DataTypes.INTEGER,
                allowNull: false,
                references: {
                    model: "hospitals",
                    key: "id",
                },
                onUpdate: "CASCADE",
                onDelete: "RESTRICT",
            },

            /**
             * Current decision status.
             *
             * Each entry is created with PENDING when the StudyRequest
             * is accepted by the Consent Management Service.
             */
            status: {
                type: DataTypes.ENUM("PENDING", "GRANTED", "DENIED", "REVOKED"),
                allowNull: false,
                defaultValue: "PENDING",
            },

            /**
             * Algorithm used by the hospital to sign its decision.
             *
             * It remains null while the decision is PENDING.
             *
             * Examples:
             * RS256
             * ES256
             * ECDSA_SHA256
             */
            signatureAlgorithm: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            /**
             * Hash of the exact decision or revocation payload
             * signed by the hospital.
             */
            signedPayloadHash: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            /**
             * Digital signature produced by the hospital.
             */
            signatureValue: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            /**
             * Explanation supplied when the hospital denies
             * or revokes its decision.
             */
            rejectionReason: {
                type: DataTypes.TEXT,
                allowNull: true,
            },

            /**
             * Date and time at which the hospital submitted
             * its most recent decision.
             *
             * It remains null while status is PENDING.
             */
            decidedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },

            /**
             * Date and time at which a GRANTED decision
             * was revoked.
             *
             * It is null unless status is REVOKED.
             */
            revokedAt: {
                type: DataTypes.DATE,
                allowNull: true,
            },
        },
        {
            tableName: "hospital_decisions",
            timestamps: true,

            indexes: [
                {
                    unique: true,
                    fields: ["studyRequestId", "hospitalId"],
                },
                {
                    fields: ["studyRequestId"],
                },
                {
                    fields: ["hospitalId"],
                },
                {
                    fields: ["status"],
                },
            ],
        },
    );

    HospitalDecision.associate = (models) => {
        HospitalDecision.belongsTo(models.StudyRequest, {
            foreignKey: "studyRequestId",
            as: "studyRequest",
        });

        HospitalDecision.belongsTo(models.Hospital, {
            foreignKey: "hospitalId",
            as: "hospital",
        });
    };

    return HospitalDecision;
};
