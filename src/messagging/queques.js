const { connectRabbitMQ } = require("./rabbitmq.connection");

const EXCHANGE_NAME = process.env.RABBITMQ_STUDY_EXCHANGE || "study.events";

function getExchangeName() {
    return EXCHANGE_NAME;
}

function getHospitalQueueName(hospitalId) {
    return `hospital.${hospitalId}.notifications`;
}

function getResearcherQueueName(researcherId) {
    return `researcher.${researcherId}.notifications`;
}

function getStudyPublishedRoutingKey(hospitalId) {
    return `study.published.hospital.${hospitalId}`;
}

function getStudyDecisionRoutingKey(researcherId, decision) {
    if (!decision) {
        throw new Error("decision is required");
    }

    return `study.decision.${decision}.researcher.${researcherId}`;
}

function getStudyDecisionBindingKey(researcherId) {
    return `study.decision.*.researcher.${researcherId}`;
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

async function initializeResearcherQueue(researcherId) {
    if (researcherId === undefined || researcherId === null) {
        throw new Error("researcherId is required");
    }

    const channel = await initializeStudyExchange();

    const queueName = getResearcherQueueName(researcherId);
    const bindingKey = getStudyDecisionBindingKey(researcherId);

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
    getResearcherQueueName,
    getStudyPublishedRoutingKey,
    getStudyDecisionRoutingKey,
    getStudyDecisionBindingKey,
    initializeStudyExchange,
    initializeHospitalQueue,
    initializeResearcherQueue,
};
