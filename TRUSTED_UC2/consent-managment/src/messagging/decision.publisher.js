const { connectRabbitMQ } = require("./rabbitmq.connection");

const {
    getExchangeName,
    getStudyDecisionRoutingKey,
    initializedataPortalQueue,
} = require("./queques");

async function submitDecision(dataPortalId, decision, message) {
    await initializedataPortalQueue(dataPortalId);

    const channel = await connectRabbitMQ();

    const accepted = channel.publish(
        getExchangeName(),
        getStudyDecisionRoutingKey(dataPortalId, decision),
        Buffer.from(JSON.stringify(message)),
        {
            persistent: true,
            contentType: "application/json",
        },
    );

    console.log(`[RabbitMQ] Decision published for dataPortal ${dataPortalId}`);

    return accepted;
}

module.exports = {
    submitDecision,
};
