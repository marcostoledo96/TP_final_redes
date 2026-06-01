const express = require("express");
const { ingestController } = require("../controllers/ingest.controller");
const { validateIngestQuery } = require("../middlewares/validate-ingest-query.middleware");

const router = express.Router();
router.get("/ingest", validateIngestQuery, ingestController);

module.exports = { ingestRouter: router };
