"use strict";

const crypto = require("crypto");

/**
 * Sends a STUDY_REQUEST_CREATED webhook to one hospital.
 *
 * @param {object} hospital
 * @param {number} hospital.id
 * @param {string} hospital.name
 * @param {string|null} hospital.webhookUrl
 *
 * @param {object} studyRequest
 */
async function sendStudyRequestCreatedWebhook(hospital, studyRequest) {
    if (!hospital) {
        throw new Error("Hospital is required");
    }

    if (!hospital.webhookUrl) {
        throw new Error(`Hospital ${hospital.id} has no webhook URL`);
    }

    if (!studyRequest) {
        throw new Error("Study request is required");
    }

    const event = {
        eventId: crypto.randomUUID(),
        eventType: "STUDY_REQUEST_CREATED",
        occurredAt: new Date().toISOString(),

        data: {
            studyRequestId: studyRequest.id,
            requestId: studyRequest.requestId,
            studyId: studyRequest.studyId,
            formType: studyRequest.formType,
            title: studyRequest.title,
            language: studyRequest.language,
            expiresAt: studyRequest.expiresAt,
            submittedAt: studyRequest.submittedAt,
        },
    };

    const response = await fetch(hospital.webhookUrl, {
        method: "POST",

        headers: {
            "Content-Type": "application/json",
            "X-Webhook-Event": event.eventType,
            "X-Webhook-Event-Id": event.eventId,
        },

        body: JSON.stringify(event),

        signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
        throw new Error(
            `Webhook delivery failed for hospital ${hospital.id}: HTTP ${response.status}`,
        );
    }

    const responseBody = await response.json().catch(() => null);

    console.log(`[Webhook] ${event.eventType} delivered to ${hospital.name}`);

    return {
        hospitalId: hospital.id,
        eventId: event.eventId,
        delivered: true,
        response: responseBody,
    };
}

/**
 * Sends the same StudyRequest event to multiple hospitals.
 *
 * A separate eventId is generated for each hospital delivery.
 */
async function sendStudyRequestCreatedWebhooks(hospitals, studyRequest) {
    if (!Array.isArray(hospitals)) {
        throw new Error("Hospitals must be an array");
    }

    const deliveries = await Promise.allSettled(
        hospitals.map((hospital) =>
            sendStudyRequestCreatedWebhook(hospital, studyRequest),
        ),
    );

    return deliveries.map((delivery, index) => {
        const hospital = hospitals[index];

        if (delivery.status === "fulfilled") {
            return delivery.value;
        }

        return {
            hospitalId: hospital.id,
            eventId: null,
            delivered: false,
            error: delivery.reason.message,
        };
    });
}

module.exports = {
    sendStudyRequestCreatedWebhook,
    sendStudyRequestCreatedWebhooks,
};
