const { connectRabbitMQ } = require("./rabbitmq.connection");

const {
    getResearcherQueueName,
    initializeResearcherQueue,
} = require("./queques");

async function startResearcherConsumer(ResearcherId) {
    await initializeResearcherQueue(ResearcherId);

    const channel = await connectRabbitMQ();
    const queueName = getResearcherQueueName(ResearcherId);

    await channel.consume(
        queueName,
        (msg) => {
            if (!msg) {
                return;
            }

            try {
                const content = JSON.parse(msg.content.toString());

                console.log(
                    `[Researcher ${ResearcherId}] Message received:`,
                    content,
                );

                channel.ack(msg);
            } catch (error) {
                console.error(
                    `[Researcher ${ResearcherId}] Consumer error:`,
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
    startResearcherConsumer,
};
