// ===== SECCIÓN: metrics.routes.js — Ruta de Métricas =====
/**
 * Define la ruta GET /metrics.
 *
 * ¿Qué devuelve?
 *   Un JSON con métricas locales (del worker que respondió) y globales
 *   (agregadas por el Primary). Sirve para monitoreo y debugging.
 */

const express = require("express");
const { metricsController } = require("../controllers/metrics.controller");

const router = express.Router();

// GET /metrics → devuelve JSON con pid, localCounter, completedEvents, etc.
router.get("/metrics", metricsController);

module.exports = { metricsRouter: router };
