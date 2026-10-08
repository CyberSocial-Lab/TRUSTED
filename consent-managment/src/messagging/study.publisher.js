const { connectRabbitMQ } = require("./rabbitmq.connection");

const {
    getExchangeName,
    getStudyPublishedRoutingKey,
    initializeHospitalQueue,
} = require("./queques");

async function submitStudy(hospitalId, message) {
    await initializeHospitalQueue(hospitalId);

    const channel = await connectRabbitMQ();

    const accepted = channel.publish(
        getExchangeName(),
        getStudyPublishedRoutingKey(hospitalId),
        Buffer.from(JSON.stringify(message)),
        {
            persistent: true,
            contentType: "application/json",
        },
    );

    console.log(`[RabbitMQ] Study published for hospital ${hospitalId}`);

    return accepted;
}

module.exports = {
    submitStudy,
};
