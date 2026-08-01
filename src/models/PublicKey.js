module.exports = (sequelize, DataTypes) => {
    const PublicKey = sequelize.define(
        "PublicKey",
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true,
            },

            publicKey: {
                type: DataTypes.TEXT,
                allowNull: false,
                unique: true,
            },

            algorithm: {
                type: DataTypes.STRING,
                allowNull: false,
            },

            registeredAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW,
            },
        },
        {
            tableName: "public_keys",
            timestamps: true,
        },
    );

    PublicKey.associate = (models) => {
        PublicKey.hasOne(models.Researcher, {
            foreignKey: "publicKeyId",
            as: "researcher",
        });
        PublicKey.hasOne(models.Hospital, {
            foreignKey: "publicKeyId",
            as: "hospital",
        });
    };

    return PublicKey;
};
