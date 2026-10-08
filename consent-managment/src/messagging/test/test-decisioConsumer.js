const { startdataPortalConsumer } = require("../decision.consumer");

// this file purpuse is to create an dataPortal listening on decision submitted.

startdataPortalConsumer(process.argv[2]);
