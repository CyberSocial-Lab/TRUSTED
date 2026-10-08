const {
    sequelize,
    StudyRequest,
    Hospital,
    HospitalDecision,
} = require("../models");

const {
    submitDecision: publishDecision,
} = require("../messagging/decision.publisher");

const ALLOWED_DECISIONS = ["GRANTED", "DENIED"];

async function submitHospitalDecision({
    studyRequestId,
    ownerId,
    decision,
    signature,
    justification,
}) {
    if (!studyRequestId) {
        throw new Error("studyRequestId is required");
    }

    if (!ownerId) {
        throw new Error("ownerId is required");
    }

    if (!decision) {
        throw new Error("decision is required");
    }

    const normalizedDecision = decision.toUpperCase();

    if (!ALLOWED_DECISIONS.includes(normalizedDecision)) {
        throw new Error("decision must be GRANTED or DENIED");
    }

    const hospital = await Hospital.findOne({
        where: {
            organizationId: ownerId,
            status: "ACTIVE",
        },
    });

    if (!hospital) {
        throw new Error("Hospital not found or inactive");
    }

    /*
     * Controlliamo la scadenza prima di aprire la transazione.
     *
     * In questo modo, se la richiesta è scaduta, possiamo salvare EXPIRED
     * senza rischiare che l'errore successivo annulli l'update con rollback.
     */
    const currentStudyRequest = await StudyRequest.findByPk(studyRequestId);

    if (!currentStudyRequest) {
        throw new Error("Study request not found");
    }

    if (
        currentStudyRequest.status === "PENDING" &&
        currentStudyRequest.expiresAt &&
        new Date(currentStudyRequest.expiresAt) <= new Date()
    ) {
        await currentStudyRequest.update({
            status: "EXPIRED",
            resolvedAt: new Date(),
        });

        throw new Error("Study request has expired");
    }

    const result = await sequelize.transaction(async (transaction) => {
        const studyRequest = await StudyRequest.findByPk(studyRequestId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!studyRequest) {
            throw new Error("Study request not found");
        }

        if (studyRequest.status !== "PENDING") {
            throw new Error(`Study request is already ${studyRequest.status}`);
        }

        const hospitalDecision = await HospitalDecision.findOne({
            where: {
                studyRequestId,
                hospitalId: hospital.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!hospitalDecision) {
            throw new Error("Hospital is not assigned to this study request");
        }

        if (hospitalDecision.status !== "PENDING") {
            throw new Error("Hospital has already submitted a decision");
        }

        if (normalizedDecision === "DENIED" && !justification) {
            throw new Error("A justification is required when denying a study");
        }

        /*
         * Qui, più avanti, puoi verificare
         * la firma dell'ospedale.
         */
        await hospitalDecision.update(
            {
                status: normalizedDecision,

                rejectionReason:
                    normalizedDecision === "DENIED" ? justification : null,

                signatureAlgorithm: signature?.algorithm ?? null,

                signedPayloadHash: signature?.signed_payload_hash ?? null,

                signatureValue: signature?.signature_value ?? null,

                decidedAt: new Date(),
            },
            { transaction },
        );

        const decisions = await HospitalDecision.findAll({
            where: {
                studyRequestId,
            },
            transaction,
        });

        const resolvedStatus = resolveStudyStatus(decisions);

        if (resolvedStatus !== studyRequest.status) {
            await studyRequest.update(
                {
                    status: resolvedStatus,

                    resolvedAt:
                        resolvedStatus === "PENDING" ? null : new Date(),
                },
                { transaction },
            );
        }

        return {
            studyRequest,
            hospitalDecision,
            resolvedStatus,
        };
    });

    /*
     * Pubblicazione RabbitMQ dopo il commit.
     */
    let notificationPublished = true;
    let publicationError = null;

    try {
        await publishDecision(
            result.studyRequest.dataPortalId,
            normalizedDecision,
            {
                eventType: "STUDY_DECISION_RECORDED",

                studyRequestId: result.studyRequest.id,

                studyId: result.studyRequest.studyId,

                dataPortalId: result.studyRequest.dataPortalId,

                hospitalId: hospital.id,

                ownerId: hospital.organizationId,

                decision: normalizedDecision,

                justification:
                    normalizedDecision === "DENIED" ? justification : null,

                studyStatus: result.resolvedStatus,

                decidedAt: result.hospitalDecision.decidedAt,
            },
        );
    } catch (error) {
        notificationPublished = false;
        publicationError = error.message;
    }

    return {
        hospitalDecision: result.hospitalDecision,

        studyStatus: result.resolvedStatus,

        notificationPublished,

        publicationError,
    };
}

async function revokeHospitalDecision({
    studyRequestId,
    ownerId,
    signature,
    justification,
}) {
    if (!studyRequestId) {
        throw new Error("studyRequestId is required");
    }

    if (!ownerId) {
        throw new Error("ownerId is required");
    }

    if (!justification) {
        throw new Error("A justification is required when revoking consent");
    }

    const hospital = await Hospital.findOne({
        where: {
            organizationId: ownerId,
            status: "ACTIVE",
        },
    });

    if (!hospital) {
        throw new Error("Hospital not found or inactive");
    }

    const result = await sequelize.transaction(async (transaction) => {
        const studyRequest = await StudyRequest.findByPk(studyRequestId, {
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!studyRequest) {
            throw new Error("Study request not found");
        }

        /*
         * La revoca deve essere consentita anche quando
         * lo studio è già APPROVED.
         *
         * Impediamo modifiche a uno studio scaduto.
         */
        if (studyRequest.status === "EXPIRED") {
            throw new Error("Cannot revoke consent for an expired study");
        }

        const hospitalDecision = await HospitalDecision.findOne({
            where: {
                studyRequestId,
                hospitalId: hospital.id,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });

        if (!hospitalDecision) {
            throw new Error("Hospital is not assigned to this study request");
        }

        /*
         * Può essere revocata solamente
         * una decisione GRANTED.
         */
        if (hospitalDecision.status !== "GRANTED") {
            throw new Error(
                `Only a GRANTED decision can be revoked. Current status: ${hospitalDecision.status}`,
            );
        }

        const revokedAt = new Date();

        await hospitalDecision.update(
            {
                status: "REVOKED",

                rejectionReason: justification,

                signatureAlgorithm: signature?.algorithm ?? null,

                signedPayloadHash: signature?.signed_payload_hash ?? null,

                signatureValue: signature?.signature_value ?? null,

                decidedAt: revokedAt,

                revokedAt,
            },
            { transaction },
        );

        /*
         * Una revoca rende automaticamente
         * lo studio REJECTED.
         */
        await studyRequest.update(
            {
                status: "REJECTED",
                resolvedAt: revokedAt,
            },
            { transaction },
        );

        return {
            studyRequest,
            hospitalDecision,
        };
    });

    /*
     * Messaggio pubblicato solamente dopo il commit.
     */
    let notificationPublished = true;
    let publicationError = null;

    try {
        await publishDecision(result.studyRequest.dataPortalId, "REVOKED", {
            eventType: "STUDY_CONSENT_REVOKED",

            studyRequestId: result.studyRequest.id,

            studyId: result.studyRequest.studyId,

            dataPortalId: result.studyRequest.dataPortalId,

            hospitalId: hospital.id,

            ownerId: hospital.organizationId,

            decision: "REVOKED",

            justification,

            studyStatus: "REJECTED",

            revokedAt: result.hospitalDecision.revokedAt,
        });
    } catch (error) {
        notificationPublished = false;
        publicationError = error.message;
    }

    return {
        hospitalDecision: result.hospitalDecision,

        studyStatus: result.studyRequest.status,

        notificationPublished,

        publicationError,
    };
}

/*
 * Regola di business:
 *
 * almeno un DENIED o REVOKED → studio REJECTED
 * tutti GRANTED              → studio APPROVED
 * altrimenti                 → studio PENDING
 */
function resolveStudyStatus(decisions) {
    const hasDeniedOrRevoked = decisions.some(
        (hospitalDecision) =>
            hospitalDecision.status === "DENIED" ||
            hospitalDecision.status === "REVOKED",
    );

    if (hasDeniedOrRevoked) {
        return "REJECTED";
    }

    const allGranted =
        decisions.length > 0 &&
        decisions.every(
            (hospitalDecision) => hospitalDecision.status === "GRANTED",
        );

    if (allGranted) {
        return "APPROVED";
    }

    return "PENDING";
}

module.exports = {
    submitHospitalDecision,
    revokeHospitalDecision,
};
