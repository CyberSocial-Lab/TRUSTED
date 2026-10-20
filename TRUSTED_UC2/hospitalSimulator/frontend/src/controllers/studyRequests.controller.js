"use strict";

const studyRequests = require("../store/studyRequests.store");

async function getStudyRequests(ctx) {
    ctx.status = 200;
    ctx.body = Array.from(studyRequests.values());
}

async function getStudyRequestById(ctx) {
    const studyRequestId = Number(ctx.params.id);

    const request = studyRequests.get(studyRequestId);

    if (!request) {
        ctx.throw(404, "Study request not found");
    }

    ctx.status = 200;
    ctx.body = request;
}

module.exports = {
    getStudyRequests,
    getStudyRequestById,
};
