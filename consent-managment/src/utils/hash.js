const crypto = require("node:crypto");

function createHash(payload) {
    const normalizedPayload =
        typeof payload === "string" ? payload : JSON.stringify(payload);

    return crypto.createHash("sha256").update(normalizedPayload).digest("hex");
}

module.exports = {
    createHash,
};
