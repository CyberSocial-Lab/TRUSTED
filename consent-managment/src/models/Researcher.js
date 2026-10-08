"use strict";

module.exports = (sequelize, DataTypes) => {
    const Researcher = sequelize.define(
        "Researcher",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
                allowNull: false,
            },

            externalId: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
            },

            name: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true,
                validate: {
                    isEmail: true,
                },
            },

            role: {
                type: DataTypes.STRING,
                allowNull: true,
            },

            organisation: {
                type: DataTypes.STRING,
                allowNull: false,
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
            tableName: "researchers",
            timestamps: false,
        },
    );

    Researcher.associate = (models) => {
        Researcher.belongsTo(models.PublicKey, {
            foreignKey: "publicKeyId",
            as: "publicKey",
        });

        if (models.StudyRequest) {
            Researcher.hasMany(models.StudyRequest, {
                foreignKey: "researcherId",
                as: "studyRequests",
            });
        }
    };

    return Researcher;
};
