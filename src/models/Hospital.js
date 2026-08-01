"use strict";

const { Model } = require("sequelize");

module.exports = (sequelize, DataTypes) => {
    class Hospital extends Model {
        static associate(models) {
            Hospital.belongsTo(models.PublicKey, {
                foreignKey: "publicKeyId",
                as: "publicKey",
            });

            // Later:
            // Hospital.hasMany(models.User, {
            //     foreignKey: "hospitalId",
            //     as: "reviewers",
            // });

            // Hospital.hasMany(models.HospitalDecision, {
            //     foreignKey: "hospitalId",
            //     as: "decisions",
            // });
        }
    }

    Hospital.init(
        {
            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            country: {
                type: DataTypes.STRING(2),
                allowNull: false,
            },

            organizationId: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },

            status: {
                type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
                allowNull: false,
                defaultValue: "ACTIVE",
            },

            publicKeyId: {
                type: DataTypes.INTEGER,
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
        {
            sequelize,
            modelName: "Hospital",
            tableName: "hospitals",
            timestamps: true,
        },
    );

    return Hospital;
};
