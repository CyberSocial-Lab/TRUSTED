"use strict";

const Router = require("@koa/router");



const { receiveStudyRequestWebhook } = require("../controllers/webhook.js");

const router = new Router({
    prefix: "/hospitals/:hospitalId/webhooks",
});

router.post("/study-requests", receiveStudyRequestWebhook);

module.exports = router;
