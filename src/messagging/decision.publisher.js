const { connectRabbitMQ } = require("./rabbitmq.connection");

const {
    getExchangeName,
    getStudyDecisionRoutingKey,
    initializeResearcherQueue,
} = require("./queques");

async function submitDecision(researcherId, decision, message) {
    await initializeResearcherQueue(researcherId);

    const channel = await connectRabbitMQ();

    const accepted = channel.publish(
        getExchangeName(),
        getStudyDecisionRoutingKey(researcherId, decision),
        Buffer.from(JSON.stringify(message)),
        {
            persistent: true,
            contentType: "application/json",
        },
    );

    console.log(`[RabbitMQ] Decision published for Researcher ${researcherId}`);

    return accepted;
}

module.exports = {
    submitDecision,
};
