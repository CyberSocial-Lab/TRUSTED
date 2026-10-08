const Koa = require("koa");
const bodyParser = require("koa-bodyparser");

const studyRequestRoutes = require("./routes/studyRequest.routes");

const studyDecisionRoutes = require("./routes/studyDecision.routes");

const app = new Koa();

app.use(bodyParser());

app.use(studyRequestRoutes.routes());
app.use(studyRequestRoutes.allowedMethods());

app.use(studyDecisionRoutes.routes());
app.use(studyDecisionRoutes.allowedMethods());

module.exports = app;
