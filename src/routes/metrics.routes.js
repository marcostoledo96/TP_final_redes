const express = require("express");
const { metricsController } = require("../controllers/metrics.controller");

const router = express.Router();
router.get("/metrics", metricsController);

module.exports = { metricsRouter: router };
