"use strict";

const Router = require("@koa/router");

const {
    submitStudyRequestDecision,
    revokeStudyRequestDecision,
} = require("../controllers/studyRequest.controller.js");

const router = new Router({
    prefix: "/hospitals/:hospitalId/api/study-requests",
});

router.post("/:studyRequestId/decision", submitStudyRequestDecision);

router.post("/:studyRequestId/revoke", revokeStudyRequestDecision);

module.exports = router;
