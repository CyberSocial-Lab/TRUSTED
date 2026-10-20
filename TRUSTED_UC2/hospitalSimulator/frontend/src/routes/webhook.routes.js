"use strict";

const Router = require("@koa/router");

const {
    getStudyRequests,
    getStudyRequestById,
} = require("../controllers/studyRequests.controller");

const router = new Router({
    prefix: "/api/study-requests",
});

router.get("/", getStudyRequests);
router.get("/:id", getStudyRequestById);

module.exports = router;
