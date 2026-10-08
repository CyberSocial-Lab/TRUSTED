require("dotenv").config();

const amqp = require("amqplib");
// if the connection is closed or fails to be established at all, we will reconnect
var amqpConn = null;
var channel = null;

async function connectRabbitMQ() {
    if (channel) {
        return channel;
    }

    const rabbitMQUrl = process.env.RABBITMQ_URL;

    if (!rabbitMQUrl) {
        throw new Error("RabbitMQ_URL is not configured");
    }

    amqpConn = await amqp.connect(rabbitMQUrl);

    amqpConn.on("error", (error) => {
        console.error("[RabbitMQ] connection error", error.message);
    });

    amqpConn.on("close", () => {
        console.warn("[RabbitMQ] conection closed");
        amqpConn = null;
        channel = null;
    });

    channel = await amqpConn.createChannel();

    channel.on("error", (error) => {
        console.error("[RabbitMQ] Channel Error:", error.message);
    });

    channel.on("close", () => {
        console.warn("[RabbitMQ] Channel closed", (channel = null));
    });

    console.log("[RabbitMQ] Connection established");

    return channel;
}

async function closeRabbitMQ() {
    try {
        if (channel) {
            await channel.close();
            channel = null;
        }

        if (amqpConn) {
            await amqpConn.close();
            amqpConn = null;
        }

        console.log("[RabbitMQ] Connection closed correctly");
    } catch (error) {
        console.error(
            "[RabbitMQ] Error while closing connection:",
            error.message,
        );
    }
}

module.exports = {
    connectRabbitMQ,
    closeRabbitMQ,
};
