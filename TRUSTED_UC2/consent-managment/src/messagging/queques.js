const { connectRabbitMQ } = require("./rabbitmq.connection");

const EXCHANGE_NAME = process.env.RABBITMQ_STUDY_EXCHANGE || "study.events";

function getExchangeName() {
    return EXCHANGE_NAME;
}

function getHospitalQueueName(hospitalId) {
    return `hospital.${hospitalId}.notifications`;
}

function getdataPortalQueueName(dataPortalId) {
    return `dataPortal.${dataPortalId}.notifications`;
}

function getStudyPublishedRoutingKey(hospitalId) {
    return `study.published.hospital.${hospitalId}`;
}

function getStudyDecisionRoutingKey(dataPortalId, decision) {
    if (!decision) {
        throw new Error("decision is required");
    }

    return `study.decision.${decision}.dataPortal.${dataPortalId}`;
}

function getStudyDecisionBindingKey(dataPortalId) {
    return `study.decision.*.dataPortal.${dataPortalId}`;
}

async function initializeStudyExchange() {
    const channel = await connectRabbitMQ();

    await channel.assertExchange(EXCHANGE_NAME, "topic", {
        durable: true,
    });

    return channel;
}

async function initializeHospitalQueue(hospitalId) {
    if (hospitalId === undefined || hospitalId === null) {
        throw new Error("hospitalId is required");
    }

    const channel = await initializeStudyExchange();

    const queueName = getHospitalQueueName(hospitalId);
    const routingKey = getStudyPublishedRoutingKey(hospitalId);

    await channel.assertQueue(queueName, {
        durable: true,
        arguments: {
            "x-queue-type": "quorum",
        },
    });

    await channel.bindQueue(queueName, EXCHANGE_NAME, routingKey);

    console.log(`[RabbitMQ] Queue "${queueName}" bound to "${routingKey}"`);

    return queueName;
}

async function initializedataPortalQueue(dataPortalId) {
    if (dataPortalId === undefined || dataPortalId === null) {
        throw new Error("dataPortalId is required");
    }

    const channel = await initializeStudyExchange();

    const queueName = getdataPortalQueueName(dataPortalId);
    const bindingKey = getStudyDecisionBindingKey(dataPortalId);

    await channel.assertQueue(queueName, {
        durable: true,
        arguments: {
            "x-queue-type": "quorum",
        },
    });

    await channel.bindQueue(queueName, EXCHANGE_NAME, bindingKey);

    console.log(`[RabbitMQ] Queue "${queueName}" bound to "${bindingKey}"`);

    return queueName;
}

module.exports = {
    getExchangeName,
    getHospitalQueueName,
    getdataPortalQueueName,
    getStudyPublishedRoutingKey,
    getStudyDecisionRoutingKey,
    getStudyDecisionBindingKey,
    initializeStudyExchange,
    initializeHospitalQueue,
    initializedataPortalQueue,
};
