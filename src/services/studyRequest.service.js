"use strict";

const { Op } = require("sequelize");

const {
    sequelize,
    StudyRequest,
    Hospital,
    HospitalDecision,
    dataPortal,
} = require("../models");

const { submitStudy } = require("../messagging/study.publisher");

const { sendStudyRequestCreatedWebhook } = require("./webhook.service");

async function publishStudyRequest({
    dataPortalId,
    requestPayload,
    applicantSignature,
}) {
    if (!dataPortalId) {
        throw new Error("dataPortalId is required");
    }

    if (!requestPayload) {
        throw new Error("requestPayload is required");
    }

    const requestedDataOwners = requestPayload.requested_data_owners;

    if (
        !Array.isArray(requestedDataOwners) ||
        requestedDataOwners.length === 0
    ) {
        throw new Error("At least one requested data owner is required");
    }

    const uniqueOwnerIds = [
        ...new Set(requestedDataOwners.map((owner) => owner.owner_id)),
    ];

    if (uniqueOwnerIds.some((ownerId) => !ownerId)) {
        throw new Error("Every requested data owner must contain owner_id");
    }

    const dataPortal = await dataPortal.findByPk(dataPortalId);

    if (!dataPortal || dataPortal.status !== "ACTIVE") {
        throw new Error("dataPortal not found or inactive");
    }

    const hospitals = await Hospital.findAll({
        where: {
            organizationId: {
                [Op.in]: uniqueOwnerIds,
            },
            status: "ACTIVE",
        },
    });

    if (hospitals.length !== uniqueOwnerIds.length) {
        const foundOwnerIds = new Set(
            hospitals.map((hospital) => hospital.organizationId),
        );

        const missingOwnerIds = uniqueOwnerIds.filter(
            (ownerId) => !foundOwnerIds.has(ownerId),
        );

        throw new Error(
            `One or more hospitals do not exist or are inactive: ${missingOwnerIds.join(", ")}`,
        );
    }

    const expiresAt =
        requestPayload.study?.expires_at ?? requestPayload.expires_at;

    if (expiresAt && new Date(expiresAt) <= new Date()) {
        throw new Error("expiresAt must be in the future");
    }

    /*
     * Tutte le modifiche al database vengono eseguite
     * atomicamente nella stessa transazione.
     */
    const studyRequest = await sequelize.transaction(async (transaction) => {
        const createdStudyRequest = await StudyRequest.create(
            {
                requestId: requestPayload.request_id,

                studyId: requestPayload.study?.study_id,

                formType: requestPayload.form_type,

                title: requestPayload.study?.title,

                language: requestPayload.study?.language,

                status: "PENDING",

                dataPortalId,

                requestPayload,

                signatureAlgorithm: applicantSignature?.signature_algorithm,

                signedPayloadHash: applicantSignature?.signed_payload_hash,

                signatureValue: applicantSignature?.signature_value,

                signedAt: applicantSignature?.signed_at,

                submittedAt: new Date(),

                expiresAt: expiresAt ?? null,
            },
            { transaction },
        );

        await HospitalDecision.bulkCreate(
            hospitals.map((hospital) => ({
                studyRequestId: createdStudyRequest.id,

                hospitalId: hospital.id,

                status: "PENDING",
            })),
            { transaction },
        );

        return createdStudyRequest;
    });

    /*
     * Tutte le comunicazioni esterne avvengono
     * dopo il commit della transazione.
     */
    const publicationErrors = [];
    const webhookErrors = [];

    for (const hospital of hospitals) {
        const requestedDatasets = requestedDataOwners
            .filter((owner) => owner.owner_id === hospital.organizationId)
            .map((owner) => ({
                datasetId: owner.dataset_id,

                countryCode: owner.country_code,
            }));

        try {
            await submitStudy(hospital.id, {
                eventType: "STUDY_PUBLISHED",

                studyRequestId: studyRequest.id,

                studyId: studyRequest.studyId,

                dataPortalId,

                hospitalId: hospital.id,

                ownerId: hospital.organizationId,

                title: studyRequest.title,

                requestedDatasets,

                publishedAt: new Date().toISOString(),

                expiresAt: studyRequest.expiresAt,
            });
        } catch (error) {
            publicationErrors.push({
                hospitalId: hospital.id,

                ownerId: hospital.organizationId,

                error: error.message,
            });
        }

        try {
            await sendStudyRequestCreatedWebhook(hospital, studyRequest);
        } catch (error) {
            webhookErrors.push({
                hospitalId: hospital.id,

                ownerId: hospital.organizationId,

                webhookUrl: hospital.webhookUrl,

                error: error.message,
            });
        }
    }

    return {
        studyRequest,

        rabbitMqNotifications: {
            delivered: hospitals.length - publicationErrors.length,

            errors: publicationErrors,
        },

        webhookNotifications: {
            delivered: hospitals.length - webhookErrors.length,

            errors: webhookErrors,
        },
    };
}

module.exports = {
    publishStudyRequest,
};
