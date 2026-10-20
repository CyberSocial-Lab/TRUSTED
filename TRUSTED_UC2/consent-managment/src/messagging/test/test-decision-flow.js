const { startdataPortalConsumer } = require("../decision.consumer");

const { submitDecision } = require("../decision.publisher");

const { closeRabbitMQ } = require("../rabbitmq.connection");

async function testDecisionFlow() {
    const dataPortalId = 7;
    const hospitalId = 1;
    const decision = "APPROVED";

    try {
        await startdataPortalConsumer(dataPortalId);

        const message = {
            eventType: "STUDY_DECISION_RECORDED",
            studyRequestId: 25,
            studyId: "STUDY-TEST-001",
            dataPortalId,
            hospitalId,
            decision,
            decidedAt: new Date().toISOString(),
        };

        await submitDecision(dataPortalId, message, decision);

        console.log("[TEST] Decision message sent");
    } catch (error) {
        console.error("[TEST] Error:", error);
        await closeRabbitMQ();
        process.exit(1);
    }
}

testDecisionFlow();
