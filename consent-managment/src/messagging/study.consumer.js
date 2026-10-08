const { connectRabbitMQ } = require("./rabbitmq.connection");

const { getHospitalQueueName, initializeHospitalQueue } = require("./queques");

async function startHospitalConsumer(hospitalId, onStudyReceived) {
    await initializeHospitalQueue(hospitalId);

    const channel = await connectRabbitMQ();
    const queueName = getHospitalQueueName(hospitalId);

    await channel.consume(
        queueName,
        async (msg) => {
            if (!msg) {
                return;
            }

            try {
                const studyMessage = JSON.parse(msg.content.toString());

                console.log(
                    `[Hospital ${hospitalId}] Study received:`,
                    studyMessage,
                );

                if (onStudyReceived) {
                    await onStudyReceived(studyMessage);
                }

                channel.ack(msg);
            } catch (error) {
                console.error(
                    `[Hospital ${hospitalId}] Consumer error:`,
                    error.message,
                );

                channel.nack(msg, false, false);
            }
        },
        {
            noAck: false,
        },
    );

    console.log(`[RabbitMQ] Hospital consumer listening on "${queueName}"`);
}

module.exports = {
    startHospitalConsumer,
};
