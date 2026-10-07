const Router = require("@koa/router");

const {
    createStudyRequest,
} = require("../controllers/studyRequest.controller");

const router = new Router({
    prefix: "/study-requests",
});

router.post("/", createStudyRequest);

module.exports = router;
