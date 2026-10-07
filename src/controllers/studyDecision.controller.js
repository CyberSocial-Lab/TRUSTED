"use strict";

const {
    submitHospitalDecision,
    revokeHospitalDecision,
} = require("../services/studyDecision.service");

async function createStudyDecision(ctx) {
    try {
        const studyRequestId = Number(ctx.params.studyRequestId);

        const {
            owner_id: ownerId,
            decision,
            signature,
            justification,
        } = ctx.request.body;

        const result = await submitHospitalDecision({
            studyRequestId,
            ownerId,
            decision,
            signature,
            justification,
        });

        ctx.status = 200;
        ctx.body = {
            message: "Hospital decision submitted successfully",
            hospitalDecision: result.hospitalDecision,
            studyStatus: result.studyStatus,
            notificationPublished: result.notificationPublished,
            publicationError: result.publicationError,
        };
    } catch (error) {
        console.error(
            "[StudyDecisionController] Submit decision error:",
            error,
        );

        handleStudyDecisionError(ctx, error);
    }
}

async function revokeStudyDecision(ctx) {
    try {
        const studyRequestId = Number(ctx.params.studyRequestId);

        const {
            owner_id: ownerId,
            signature,
            justification,
        } = ctx.request.body;

        const result = await revokeHospitalDecision({
            studyRequestId,
            ownerId,
            signature,
            justification,
        });

        ctx.status = 200;
        ctx.body = {
            message: "Hospital decision revoked successfully",
            hospitalDecision: result.hospitalDecision,
            studyStatus: result.studyStatus,
            notificationPublished: result.notificationPublished,
            publicationError: result.publicationError,
        };
    } catch (error) {
        console.error(
            "[StudyDecisionController] Revoke decision error:",
            error,
        );

        handleStudyDecisionError(ctx, error);
    }
}

function handleStudyDecisionError(ctx, error) {
    const message = error.message;

    if (
        message === "Study request not found" ||
        message === "Hospital not found or inactive" ||
        message === "Hospital is not assigned to this study request"
    ) {
        ctx.status = 404;
    } else if (
        message.includes("already") ||
        message.includes("Only an APPROVED decision") ||
        message.includes("expired")
    ) {
        ctx.status = 409;
    } else {
        ctx.status = 400;
    }

    ctx.body = {
        error: message,
    };
}

module.exports = {
    createStudyDecision,
    revokeStudyDecision,
};
