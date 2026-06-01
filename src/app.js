const express = require("express");
const path = require("path");
const { mountRoutes } = require("./routes");
const { notFoundMiddleware } = require("./middlewares/not-found.middleware");
const { errorMiddleware } = require("./middlewares/error.middleware");

function createApp() {
  const app = express();

  app.use(express.json());
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));
  app.use(express.static(path.join(__dirname, "..", "public")));

  mountRoutes(app);

  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

module.exports = { createApp };
