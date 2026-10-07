"use strict";

/** @type {import("sequelize-cli").Migration} */
module.exports = {
    async up(queryInterface) {
        const [publicKeys] = await queryInterface.sequelize.query(`
                SELECT id
                FROM public_keys
                ORDER BY id ASC
            `);

        if (publicKeys.length < 3) {
            throw new Error(
                `At least 3 public keys are required. Found: ${publicKeys.length}`,
            );
        }

        const now = new Date();

        await queryInterface.bulkInsert(
            "hospitals",
            [
                {
                    name: "ULS Coimbra",
                    country: "PT",
                    organizationId: "123-ABC",
                    status: "ACTIVE",
                    webhookUrl:
                        "http://localhost:4001/hospitals/1/webhooks/study-requests",
                    publicKeyId: publicKeys[0].id,
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    name: "HM Hospitales",
                    country: "ES",
                    organizationId: "456-ABC",
                    status: "ACTIVE",
                    webhookUrl:
                        "http://localhost:4001/hospitals/2/webhooks/study-requests",
                    publicKeyId: publicKeys[1].id,
                    createdAt: now,
                    updatedAt: now,
                },
                {
                    name: "Elsan",
                    country: "FR",
                    organizationId: "678-ABC",
                    status: "ACTIVE",
                    webhookUrl:
                        "http://localhost:4001/hospitals/3/webhooks/study-requests",
                    publicKeyId: publicKeys[2].id,
                    createdAt: now,
                    updatedAt: now,
                },
            ],
            {},
        );
    },

    async down(queryInterface) {
        await queryInterface.bulkDelete(
            "hospitals",
            {
                organizationId: ["123-ABC", "456-ABC", "678-ABC"],
            },
            {},
        );
    },
};
