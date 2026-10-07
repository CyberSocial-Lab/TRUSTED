"use strict";

const fs = require("node:fs");
const path = require("node:path");

const hospitalPublicKey = fs
    .readFileSync(
        path.join(__dirname, "../test/fixtures/keys/hospital-public.pem"),
        "utf8",
    )
    .match(/-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/g);

if (!hospitalPublicKey) {
    throw new Error("no public key found");
}

const dataPortalPublicKey = fs
    .readFileSync(
        path.join(__dirname, "../test/fixtures/keys/dataPortal-public.pem"),
        "utf8",
    )
    .match(/-----BEGIN PUBLIC KEY-----[\s\S]*?-----END PUBLIC KEY-----/g);
if (!dataPortalPublicKey) {
    throw new Error("no public key found");
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
    async up(queryInterface, Sequelize) {
        const now = new Date();
        await queryInterface.bulkInsert("public_keys", [
            {
                publicKey: hospitalPublicKey[0],
                algorithm: "RSA",
                createdAt: now,
                updatedAt: now,
            },
            {
                publicKey: hospitalPublicKey[1],
                algorithm: "RSA",
                createdAt: now,
                updatedAt: now,
            },
            {
                publicKey: hospitalPublicKey[2],
                algorithm: "RSA",
                createdAt: now,
                updatedAt: now,
            },
            {
                publicKey: dataPortalPublicKey[0],
                algorithm: "RSA",
                createdAt: now,
                updatedAt: now,
            },
        ]);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete("public_keys", {
            publicKey: {
                [Sequelize.Op.in]: [hospitalPublicKey, dataPortalPublicKey],
            },
        });
    },
};
