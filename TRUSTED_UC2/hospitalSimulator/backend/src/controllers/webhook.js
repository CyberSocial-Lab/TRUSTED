"use strict";

const { getHospitalStore } = require("../store/studyRequests.store");

async function receiveStudyRequestWebhook(ctx) {
    const { hospitalId } = ctx.params;
    const event = ctx.request.body;

    if (!hospitalId) {
        ctx.throw(400, "hospitalId is required");
    }

    if (!event?.eventId) {
        ctx.throw(400, "eventId is required");
    }

    if (event.eventType !== "STUDY_REQUEST_CREATED") {
        ctx.throw(400, "Unsupported event type");
    }

    const request = event.data;

    if (!request?.studyRequestId) {
        ctx.throw(400, "studyRequestId is required");
    }

    const hospitalStore = getHospitalStore(hospitalId);

    hospitalStore.set(request.studyRequestId, {
        ...request,
        eventId: event.eventId,
        eventType: event.eventType,
        occurredAt: event.occurredAt ?? null,
        receivedAt: new Date().toISOString(),
        decisionStatus: "PENDING",
        justification: null,
    });

    console.log(
        `[Hospital ${hospitalId}] Received study request ${request.studyRequestId}`,
    );

    ctx.status = 200;
    ctx.body = {
        received: true,
        hospitalId,
        eventId: event.eventId,
        studyRequestId: request.studyRequestId,
    };
}

module.exports = {
    receiveStudyRequestWebhook,
};
