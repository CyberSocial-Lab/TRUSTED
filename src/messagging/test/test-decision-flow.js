const { startResearcherConsumer } = require("../decision.consumer");

const { submitDecision } = require("../decision.publisher");

const { closeRabbitMQ } = require("../rabbitmq.connection");

async function testDecisionFlow() {
    const researcherId = 7;
    const hospitalId = 1;
    const decision = "APPROVED";

    try {
        await startResearcherConsumer(researcherId);

        const message = {
            eventType: "STUDY_DECISION_RECORDED",
            studyRequestId: 25,
            studyId: "STUDY-TEST-001",
            researcherId,
            hospitalId,
            decision,
            decidedAt: new Date().toISOString(),
        };

        await submitDecision(researcherId, message, decision);

        console.log("[TEST] Decision message sent");
    } catch (error) {
        console.error("[TEST] Error:", error);
        await closeRabbitMQ();
        process.exit(1);
    }
}

testDecisionFlow();
