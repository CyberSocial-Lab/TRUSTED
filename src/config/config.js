const path = require("path");

require("dotenv").config({
    path: path.resolve(__dirname, "../../.env"),
});

module.exports = {
    development: {
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        host: process.env.DB_HOST || "localhost",
        port: Number(process.env.POSTGRES_PORT || 5433),
        dialect: "postgres",
        logging: false,
    },
};
