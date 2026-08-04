"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const [pk] = await queryInterface.sequelize.query(
            `SELECT id FROM public_keys ORDER BY id ASC`,
        );
        if (pk.length < 1) {
            throw new Error("Nessuna chiave pubblica trovata");
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
                    publicKeyId: pk[0].id,
                    updatedAt: now,
                },
            ],
            {},
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete(
            "hospitals",
            {
                organizationId: "123-ABC",
            },
            {},
        );
    },
};
