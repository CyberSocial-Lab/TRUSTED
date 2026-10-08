const { startHospitalConsumer } = require("../study.consumer");

// this file purpuse is to create an hospital listening on study published.
startHospitalConsumer(process.argv[2]);

