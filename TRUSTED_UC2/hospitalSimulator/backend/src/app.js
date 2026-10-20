"use strict";

const Koa = require("koa");
const Router = require("@koa/router");
const bodyParser = require("koa-bodyparser");
const cors = require("@koa/cors");

const app = new Koa();
const router = new Router();

const port = Number(process.env.PORT || 4001);

const consentManagementUrl =
    process.env.CONSENT_MANAGEMENT_URL || "http://localhost:3000";

const OWNER_ID_BY_HOSPITAL = {
    1: "123-ABC",
    2: "456-ABC",
    3: "678-ABC",
};

/*
 * hospitalsStore = Map<
 *   hospitalId,
 *   Map<studyRequestId, studyRequest>
 * >
 */
const hospitalsStore = new Map();

function getHospitalStore(hospitalId) {
    const normalizedHospitalId = String(hospitalId);

    if (!hospitalsStore.has(normalizedHospitalId)) {
        hospitalsStore.set(normalizedHospitalId, new Map());
    }

    return hospitalsStore.get(normalizedHospitalId);
}

/*
 * Gestione centralizzata degli errori.
 */
app.use(async (ctx, next) => {
    try {
        await next();
    } catch (error) {
        console.error("[Hospital simulator]", error);

        ctx.status = error.status || 500;
        ctx.body = {
            error: error.message || "Internal server error",
        };
    }
});

app.use(cors());
app.use(bodyParser());

/*
 * Health check.
 *
 * GET /health
 */
router.get("/health", async (ctx) => {
    ctx.status = 200;
    ctx.body = {
        status: "ok",
        service: "hospital-simulator",
    };
});

/*
 * Riceve una nuova StudyRequest dal Consent Management.
 *
 * POST /hospitals/1/webhooks/study-requests
 */
router.post("/hospitals/:hospitalId/webhooks/study-requests", async (ctx) => {
    const { hospitalId } = ctx.params;
    const event = ctx.request.body;

    if (!OWNER_ID_BY_HOSPITAL[String(hospitalId)]) {
        ctx.throw(404, "Hospital not found");
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

    const numericStudyRequestId = Number(request.studyRequestId);

    if (!Number.isInteger(numericStudyRequestId)) {
        ctx.throw(400, "studyRequestId must be a valid number");
    }

    const hospitalStore = getHospitalStore(hospitalId);

    hospitalStore.set(numericStudyRequestId, {
        ...request,
        studyRequestId: numericStudyRequestId,
        eventId: event.eventId,
        eventType: event.eventType,
        occurredAt: event.occurredAt ?? null,
        receivedAt: new Date().toISOString(),
        decisionStatus: "PENDING",
        justification: null,
        decidedAt: null,
        revokedAt: null,
    });

    console.log("\n==================================");
    console.log(`[Hospital ${hospitalId}] Webhook received`);
    console.dir(event, { depth: null });
    console.log("==================================\n");

    ctx.status = 200;
    ctx.body = {
        received: true,
        hospitalId,
        eventId: event.eventId,
        studyRequestId: numericStudyRequestId,
    };
});

/*
 * Restituisce tutte le StudyRequest ricevute
 * da uno specifico ospedale.
 *
 * GET /hospitals/1/api/study-requests
 */
router.get("/hospitals/:hospitalId/api/study-requests", async (ctx) => {
    const { hospitalId } = ctx.params;

    if (!OWNER_ID_BY_HOSPITAL[String(hospitalId)]) {
        ctx.throw(404, "Hospital not found");
    }

    const hospitalStore = getHospitalStore(hospitalId);

    ctx.status = 200;
    ctx.body = Array.from(hospitalStore.values());
});

/*
 * Restituisce una singola StudyRequest.
 *
 * GET /hospitals/1/api/study-requests/4
 */
router.get(
    "/hospitals/:hospitalId/api/study-requests/:studyRequestId",
    async (ctx) => {
        const { hospitalId, studyRequestId } = ctx.params;

        if (!OWNER_ID_BY_HOSPITAL[String(hospitalId)]) {
            ctx.throw(404, "Hospital not found");
        }

        const numericStudyRequestId = Number(studyRequestId);

        if (!Number.isInteger(numericStudyRequestId)) {
            ctx.throw(400, "studyRequestId must be a valid number");
        }

        const hospitalStore = getHospitalStore(hospitalId);

        const studyRequest = hospitalStore.get(numericStudyRequestId);

        if (!studyRequest) {
            ctx.throw(404, "Study request not found");
        }

        ctx.status = 200;
        ctx.body = studyRequest;
    },
);

/*
 * Invia GRANTED o DENIED al Consent Management.
 *
 * POST /hospitals/1/api/study-requests/4/decision
 *
 * Body GRANTED:
 * {
 *   "decision": "GRANTED"
 * }
 *
 * Body DENIED:
 * {
 *   "decision": "DENIED",
 *   "justification": "Dataset unavailable"
 * }
 */
router.post(
    "/hospitals/:hospitalId/api/study-requests/:studyRequestId/decision",
    async (ctx) => {
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
            ctx.throw(400, "justification is required when decision is DENIED");
        }

        const hospitalStore = getHospitalStore(hospitalId);

        const localStudyRequest = hospitalStore.get(numericStudyRequestId);

        if (!localStudyRequest) {
            ctx.throw(404, "Study request not found");
        }

        if (localStudyRequest.decisionStatus !== "PENDING") {
            ctx.throw(
                409,
                `Study request already decided as ${localStudyRequest.decisionStatus}`,
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
                `${consentManagementUrl}/study-requests/${numericStudyRequestId}/decisions`,
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

        const responseBody = await response.json().catch(() => null);

        if (!response.ok) {
            console.error(
                "[Hospital simulator] Consent Management rejected decision:",
                {
                    status: response.status,
                    body: responseBody,
                },
            );

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
                normalizedDecision === "DENIED"
                    ? normalizedJustification
                    : null,
            decidedAt: new Date().toISOString(),
            revokedAt: null,
        };

        hospitalStore.set(numericStudyRequestId, updatedStudyRequest);

        console.log(
            `[Hospital ${hospitalId}] Study request ${numericStudyRequestId}: ${normalizedDecision}`,
        );

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
    },
);

/*
 * Revoca una decisione precedentemente GRANTED.
 *
 * POST /hospitals/1/api/study-requests/4/revoke
 */
router.post(
    "/hospitals/:hospitalId/api/study-requests/:studyRequestId/revoke",
    async (ctx) => {
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
            justification: "Revoked - reason not yet implemented",
        };

        console.log("[Hospital simulator] Sending revoke payload:", payload);

        let response;

        try {
            response = await fetch(
                `${consentManagementUrl}/study-requests/${numericStudyRequestId}/decisions/revoke`,
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

        const responseBody = await response.json().catch(() => null);

        if (!response.ok) {
            console.error(
                "[Hospital simulator] Consent Management rejected revocation:",
                {
                    status: response.status,
                    body: responseBody,
                },
            );

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

        console.log(
            `[Hospital ${hospitalId}] Study request ${numericStudyRequestId}: REVOKED`,
        );

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
    },
);

app.use(router.routes());
app.use(router.allowedMethods());

app.listen(port, () => {
    console.log(`[Hospital simulator] running on http://localhost:${port}`);

    console.log(
        `[Hospital simulator] Consent Management: ${consentManagementUrl}`,
    );
});
