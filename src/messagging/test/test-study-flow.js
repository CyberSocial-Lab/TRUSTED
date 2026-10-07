const { startHospitalConsumer } = require("../study.consumer");

const { submitStudy } = require("../study.publisher");

const { closeRabbitMQ } = require("../rabbitmq.connection");

async function testStudyFlow() {
    const hospitalId = 1;

    try {
        await startHospitalConsumer(hospitalId);
        const message = {
            eventType: "STUDY_PUBLISHED",
            studyRequestId: 25,
            studyId: "STUDY-TEST-001",
            dataPortalId: 7,
            hospitalId,
            title: "Test study RabbitMQ",
            publishedAt: new Date().toISOString(),
        };

        await submitStudy(hospitalId, message);

        console.log("[TEST] Study message sent");
    } catch (error) {
        console.error("[TEST] Error:", error);
        await closeRabbitMQ();
        process.exit(1);
    }
}

testStudyFlow();
