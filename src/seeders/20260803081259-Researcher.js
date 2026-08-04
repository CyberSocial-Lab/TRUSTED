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
            "researchers",
            [
                {
                    externalId: "Marco Bianchi",
                    name: "ULS Coimbra",
                    email: "m.bianchi@eihr.eu",
                    role: "Data Access Coordinator",
                    organisation: "European Institute for Health Research",
                    status: "ACTIVE",
                    publicKeyId: pk[1].id,
                },
            ],
            {},
        );
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("researchers", null, {});
    },
};
