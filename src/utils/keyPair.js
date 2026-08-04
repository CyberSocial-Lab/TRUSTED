// utils/crypto/keyPair.js
const crypto = require("node:crypto");
const fs = require("node:fs");

function generateKeyPair() {
    return crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: "spki",
            format: "pem",
        },
        privateKeyEncoding: {
            type: "pkcs8",
            format: "pem",
        },
    });
}

function validatePublicKey(publicKey) {
    try {
        crypto.createPublicKey(publicKey);
        return true;
    } catch {
        return false;
    }
}

function validatePrivateKey(privateKey) {
    try {
        crypto.createPrivateKey(privateKey);
        return true;
    } catch {
        return false;
    }
}

module.exports = {
    generateKeyPair,
    validatePublicKey,
    validatePrivateKey,
};




// preparing file keypair for seeders and for test purposes.

var keyPair = generateKeyPair();
fs.writeFileSync(
    "../test/fixtures/keys/hospital-private.pem",
    keyPair.privateKey,
);
keyPair = generateKeyPair();
fs.writeFileSync(
    "../test/fixtures/keys/hospital-public.pem",
    keyPair.publicKey,
);
keyPair = generateKeyPair();
fs.writeFileSync(
    "../test/fixtures/keys/researcher-private.pem",
    keyPair.privateKey,
);
keyPair = generateKeyPair();
fs.writeFileSync(
    "../test/fixtures/keys/researcher-public.pem",
    keyPair.publicKey,
);
