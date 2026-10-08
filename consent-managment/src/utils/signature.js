// utils/crypto/signature.js
const crypto = require("node:crypto");

function signPayload(payload, privateKey) {
    return crypto
        .sign("sha256", Buffer.from(payload), privateKey)
        .toString("base64");
}

function verifySignature(payload, signature, publicKey) {
    return crypto.verify(
        "sha256",
        Buffer.from(payload),
        publicKey,
        Buffer.from(signature, "base64"),
    );
}

module.exports = {
    signPayload,
    verifySignature,
};
