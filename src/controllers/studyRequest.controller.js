"use strict";

const { publishStudyRequest } = require("../services/studyRequest.service");

async function createStudyRequest(ctx) {
    try {
        const {
            dataPortal_id: dataPortalId,
            request_payload: requestPayload,
            applicant_signature: applicantSignature,
        } = ctx.request.body;

        const result = await publishStudyRequest({
            dataPortalId,
            requestPayload,
            applicantSignature,
        });

        ctx.status = 201;
        ctx.body = {
            message: "Study request created successfully",

            studyRequest: result.studyRequest,

            rabbitMqNotifications: result.rabbitMqNotifications,

            webhookNotifications: result.webhookNotifications,
        };
    } catch (error) {
        console.error("[StudyRequestController] Error:", error);

        ctx.status = 400;
        ctx.body = {
            error: error.message,
        };
    }
}

module.exports = {
    createStudyRequest,
};
