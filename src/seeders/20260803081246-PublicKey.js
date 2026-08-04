"use strict";

const fs = require("node:fs");
const path = require("node:path");

const hospitalPublicKey = fs.readFileSync(
    path.join(__dirname, "../test/fixtures/keys/hospital-public.pem"),
    "utf8",
);

const researcherPublicKey = fs.readFileSync(
    path.join(__dirname, "../test/fixtures/keys/researcher-public.pem"),
    "utf8",
);

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();
        await queryInterface.bulkInsert("public_keys", [
            {
                publicKey: hospitalPublicKey,
                algorithm: "RSA",
                createdAt: now,
                updatedAt: now,
            },
            {
                publicKey: researcherPublicKey,
                algorithm: "RSA",
                createdAt: now,
                updatedAt: now,
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("public_keys", {
            publicKey: {
                [Sequelize.Op.in]: [hospitalPublicKey, researcherPublicKey],
            },
        });
    },
};
