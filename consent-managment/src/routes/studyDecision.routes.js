const Router = require("@koa/router");

const {
    createStudyDecision,
    revokeStudyDecision,
} = require("../controllers/studyDecision.controller");

const router = new Router();

router.post("/study-requests/:studyRequestId/decisions", createStudyDecision);

router.post(
    "/study-requests/:studyRequestId/decisions/revoke",
    revokeStudyDecision,
);

module.exports = router;
