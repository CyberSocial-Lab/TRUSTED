const path = require("node:path");

require("dotenv").config({
    path: path.resolve(__dirname, "../../../.env"),
    quiet: true,
});

const {
    sequelize,
    dataPortal,
    Hospital,
    StudyRequest,
    HospitalDecision,
} = require("../../models");

const { publishStudyRequest } = require("../studyRequest.service");

const { submitHospitalDecision } = require("../studyDecision.service");

const { closeRabbitMQ } = require("../../messagging/rabbitmq.connection");

async function testStudyFlow() {
    try {
        await sequelize.authenticate();

        console.log("[TEST] Database connected");

        /*
         * Recuperiamo l'unico dataPortal attivo presente
         * nel database.
         */
        const dataPortal = await dataPortal.findOne({
            where: {
                status: "ACTIVE",
            },
        });

        if (!dataPortal) {
            throw new Error("No active dataPortal found");
        }

        /*
         * Recuperiamo l'unico ospedale attivo presente
         * nel database.
         */
        const hospital = await Hospital.findOne({
            where: {
                status: "ACTIVE",
            },
        });

        if (!hospital) {
            throw new Error("No active hospital found");
        }

        console.log("[TEST] dataPortal:", {
            id: dataPortal.id,
            name: dataPortal.name,
            email: dataPortal.email,
        });

        console.log("[TEST] Hospital:", {
            id: hospital.id,
            name: hospital.name,
            organizationId: hospital.organizationId,
        });

        /*
         * Serve per evitare collisioni con i vincoli UNIQUE
         * di requestId e studyId quando rilanciamo il test.
         */
        const uniqueSuffix = Date.now();

        const requestPayload = {
            request_id: `req_test_${uniqueSuffix}`,

            form_type: "DATA_ACCESS_APPLICATION",
            study: {
                study_id: `study_test_${uniqueSuffix}`,
                title: "Test study request",
                language: "en",

                expires_at: new Date(
                    Date.now() + 24 * 60 * 60 * 1000,
                ).toISOString(),
            },

            submitted_by: {
                name: dataPortal.name,
                email: dataPortal.email,
                role: dataPortal.role,
                organisation: dataPortal.organisation,
            },

            requested_data_owners: [
                {
                    owner_id: hospital.organizationId,

                    country_code: hospital.country,

                    dataset_id: "DATASET-TEST-001",
                },
            ],

            purpose_of_use: {
                purpose: "scientific_research",
            },

            acknowledgements: {
                terms_accepted: true,
            },
        };

        /*
         * Per ora utilizziamo dati simulati.
         * Quando inseriremo verifySignature(),
         * dovremo generare un hash e una firma reali.
         */
        const applicantSignature = {
            public_key_id: `dataPortal-key-${dataPortal.id}`,

            signature_algorithm: "RSA-SHA256",

            signed_payload_hash: "test-hash",

            signature_value: "test-signature",

            signed_at: new Date().toISOString(),
        };

        console.log("\n[TEST] Publishing study request...");

        const publicationResult = await publishStudyRequest({
            dataPortalId: dataPortal.id,
            requestPayload,
            applicantSignature,
        });

        if (!publicationResult?.studyRequest) {
            throw new Error(
                "publishStudyRequest did not return a studyRequest",
            );
        }

        const studyRequest = publicationResult.studyRequest;

        console.log("[TEST] Study created:", {
            id: studyRequest.id,
            requestId: studyRequest.requestId,
            studyId: studyRequest.studyId,
            status: studyRequest.status,
        });

        console.log("[TEST] RabbitMQ result:", {
            hospitalsNotified: publicationResult.hospitalsNotified,

            publicationErrors: publicationResult.publicationErrors,
        });

        /*
         * Controlliamo che il service abbia creato
         * la decisione PENDING per l'ospedale.
         */
        const pendingDecision = await HospitalDecision.findOne({
            where: {
                studyRequestId: studyRequest.id,

                hospitalId: hospital.id,
            },
        });

        if (!pendingDecision) {
            throw new Error("HospitalDecision was not created");
        }

        console.log("[TEST] Pending decision created:", {
            id: pendingDecision.id,

            studyRequestId: pendingDecision.studyRequestId,

            hospitalId: pendingDecision.hospitalId,

            status: pendingDecision.status,
        });

        if (studyRequest.status !== "PENDING") {
            throw new Error(
                `Expected StudyRequest PENDING, received ${studyRequest.status}`,
            );
        }

        if (pendingDecision.status !== "PENDING") {
            throw new Error(
                `Expected HospitalDecision PENDING, received ${pendingDecision.status}`,
            );
        }

        console.log("\n[TEST] Hospital approves study...");

        const decisionResult = await submitHospitalDecision({
            studyRequestId: studyRequest.id,

            ownerId: hospital.organizationId,

            decision: "APPROVED",

            signature: {
                public_key_id: `hospital-key-${hospital.id}`,

                algorithm: "RSA-SHA256",

                signed_payload_hash: "test-decision-hash",

                signature_value: "test-decision-signature",

                signed_at: new Date().toISOString(),
            },
        });

        if (!decisionResult) {
            throw new Error("submitHospitalDecision returned no result");
        }

        console.log("[TEST] Decision result:", {
            decision: decisionResult.hospitalDecision?.status,

            studyStatus: decisionResult.studyStatus,

            notificationPublished: decisionResult.notificationPublished,

            publicationError: decisionResult.publicationError,
        });

        /*
         * Ricarichiamo i record dal database per verificare
         * lo stato realmente persistito.
         */
        const updatedStudy = await StudyRequest.findByPk(studyRequest.id);

        const updatedDecision = await HospitalDecision.findOne({
            where: {
                studyRequestId: studyRequest.id,

                hospitalId: hospital.id,
            },
        });

        if (!updatedStudy) {
            throw new Error("Updated StudyRequest not found");
        }

        if (!updatedDecision) {
            throw new Error("Updated HospitalDecision not found");
        }

        console.log("\n[TEST] Final database state:");

        console.log({
            studyRequestStatus: updatedStudy.status,

            hospitalDecisionStatus: updatedDecision.status,
        });

        /*
         * Essendoci un solo ospedale, quando approva,
         * tutti gli ospedali coinvolti hanno approvato.
         */
        if (updatedStudy.status !== "APPROVED") {
            throw new Error(
                `Expected final study status APPROVED, received ${updatedStudy.status}`,
            );
        }

        if (updatedDecision.status !== "APPROVED") {
            throw new Error(
                `Expected decision APPROVED, received ${updatedDecision.status}`,
            );
        }

        console.log("\n✅ TEST COMPLETED SUCCESSFULLY");
    } catch (error) {
        console.error("\n❌ TEST FAILED");
        console.error(error);

        process.exitCode = 1;
    } finally {
        /*
         * Chiudiamo prima RabbitMQ e poi PostgreSQL.
         */
        try {
            if (typeof closeRabbitMQ === "function") {
                await closeRabbitMQ();
            }
        } catch (error) {
            console.error("[TEST] RabbitMQ close error:", error.message);
        }

        try {
            await sequelize.close();
        } catch (error) {
            console.error("[TEST] Database close error:", error.message);
        }
    }
}

testStudyFlow();
