"use strict";

const { getHospitalStore } = require("../store/studyRequests.store");

const OWNER_ID_BY_HOSPITAL = {
    1: "123-ABC",
    2: "456-ABC",
    3: "678-ABC",
};

const CONSENT_MANAGEMENT_URL =
    process.env.CONSENT_MANAGEMENT_URL || "http://localhost:3000";

async function parseResponse(response) {
    return response.json().catch(() => null);
}

async function submitStudyRequestDecision(ctx) {
    const { hospitalId, studyRequestId } = ctx.params;
    const { decision, justification } = ctx.request.body ?? {};

    const ownerId = OWNER_ID_BY_HOSPITAL[String(hospitalId)];

    if (!ownerId) {
        ctx.throw(404, "Hospital not found");
    }

    const numericStudyRequestId = Number(studyRequestId);

    if (!Number.isInteger(numericStudyRequestId)) {
        ctx.throw(400, "studyRequestId must be a valid number");
    }

    const normalizedDecision = decision?.trim().toUpperCase();

    if (!["GRANTED", "DENIED"].includes(normalizedDecision)) {
        ctx.throw(400, "decision must be GRANTED or DENIED");
    }

    const normalizedJustification = justification?.trim() || null;

    if (normalizedDecision === "DENIED" && !normalizedJustification) {
        ctx.throw(400, "A justification is required when denying a study");
    }

    const hospitalStore = getHospitalStore(hospitalId);

    const localStudyRequest = hospitalStore.get(numericStudyRequestId);

    if (!localStudyRequest) {
        ctx.throw(404, "Study request not found");
    }

    if (localStudyRequest.decisionStatus !== "PENDING") {
        ctx.throw(
            409,
            `Study request already decided: ${localStudyRequest.decisionStatus}`,
        );
    }

    const payload = {
        owner_id: ownerId,
        decision: normalizedDecision,
        signature: "this-is-a-signature",
        justification:
            normalizedDecision === "DENIED" ? normalizedJustification : "",
    };

    console.log("[Hospital simulator] Sending decision payload:", payload);

    let response;

    try {
        response = await fetch(
            `${CONSENT_MANAGEMENT_URL}/study-requests/${numericStudyRequestId}/decisions`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            },
        );
    } catch (error) {
        console.error(
            "[Hospital simulator] Consent Management unreachable:",
            error,
        );

        ctx.throw(502, "Consent Management service is unreachable");
    }

    const responseBody = await parseResponse(response);

    if (!response.ok) {
        ctx.status = response.status;
        ctx.body = {
            error:
                responseBody?.error ||
                responseBody?.message ||
                "Consent Management rejected the decision",
            details: responseBody,
        };

        return;
    }

    const updatedStudyRequest = {
        ...localStudyRequest,
        decisionStatus: normalizedDecision,
        justification:
            normalizedDecision === "DENIED" ? normalizedJustification : null,
        decidedAt: new Date().toISOString(),
        revokedAt: null,
    };

    hospitalStore.set(numericStudyRequestId, updatedStudyRequest);

    ctx.status = 200;
    ctx.body = {
        message: "Decision submitted successfully",
        hospitalId,
        ownerId,
        studyRequestId: numericStudyRequestId,
        decision: normalizedDecision,
        studyRequest: updatedStudyRequest,
        consentManagementResponse: responseBody,
    };
}

async function revokeStudyRequestDecision(ctx) {
    const { hospitalId, studyRequestId } = ctx.params;

    const ownerId = OWNER_ID_BY_HOSPITAL[String(hospitalId)];

    if (!ownerId) {
        ctx.throw(404, "Hospital not found");
    }

    const numericStudyRequestId = Number(studyRequestId);

    if (!Number.isInteger(numericStudyRequestId)) {
        ctx.throw(400, "studyRequestId must be a valid number");
    }

    const hospitalStore = getHospitalStore(hospitalId);

    const localStudyRequest = hospitalStore.get(numericStudyRequestId);

    if (!localStudyRequest) {
        ctx.throw(404, "Study request not found");
    }

    if (localStudyRequest.decisionStatus !== "GRANTED") {
        ctx.throw(409, "Only a GRANTED decision can be revoked");
    }

    const payload = {
        owner_id: ownerId,
        signature: "this-is-a-revoke-signature",
    };

    console.log("[Hospital simulator] Sending revoke payload:", payload);

    let response;

    try {
        response = await fetch(
            `${CONSENT_MANAGEMENT_URL}/study-requests/${numericStudyRequestId}/decisions/revoke`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            },
        );
    } catch (error) {
        console.error(
            "[Hospital simulator] Consent Management unreachable:",
            error,
        );

        ctx.throw(502, "Consent Management service is unreachable");
    }

    const responseBody = await parseResponse(response);

    if (!response.ok) {
        ctx.status = response.status;
        ctx.body = {
            error:
                responseBody?.error ||
                responseBody?.message ||
                "Consent Management rejected the revocation",
            details: responseBody,
        };

        return;
    }

    const updatedStudyRequest = {
        ...localStudyRequest,
        decisionStatus: "REVOKED",
        justification: "Revoked - reason not yet implemented",
        revokedAt: new Date().toISOString(),
    };

    hospitalStore.set(numericStudyRequestId, updatedStudyRequest);

    ctx.status = 200;
    ctx.body = {
        message: "Decision revoked successfully",
        hospitalId,
        ownerId,
        studyRequestId: numericStudyRequestId,
        decision: "REVOKED",
        studyRequest: updatedStudyRequest,
        consentManagementResponse: responseBody,
    };
}

module.exports = {
    submitStudyRequestDecision,
    revokeStudyRequestDecision,
};
