const { connectRabbitMQ } = require("./rabbitmq.connection");

const {
    getdataPortalQueueName,
    initializedataPortalQueue,
} = require("./queques");

async function startdataPortalConsumer(dataPortalId) {
    await initializedataPortalQueue(dataPortalId);

    const channel = await connectRabbitMQ();
    const queueName = getdataPortalQueueName(dataPortalId);

    await channel.consume(
        queueName,
        (msg) => {
            if (!msg) {
                return;
            }

            try {
                const content = JSON.parse(msg.content.toString());

                console.log(
                    `[dataPortal ${dataPortalId}] Message received:`,
                    content,
                );

                channel.ack(msg);
            } catch (error) {
                console.error(
                    `[dataPortal ${dataPortalId}] Consumer error:`,
                    error.message,
                );

                channel.nack(msg, false, false);
            }
        },
        {
            noAck: false,
        },
    );

    console.log(`[RabbitMQ] Consumer listening on "${queueName}"`);
}

module.exports = {
    startdataPortalConsumer,
};
