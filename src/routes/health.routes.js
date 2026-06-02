// ===== SECCIÓN: health.routes.js — Ruta de Health Check =====
/**
 * Define la ruta GET /health.
 *
 * ¿Qué es un router en Express?
 *   Es un "mini-servidor" dentro de Express. Las rutas definidas en el router
 *   se montan bajo un prefijo (o en la raíz). Acá solo tenemos una: /health.
 *   Los routers permiten separar rutas por dominio (salud, ingest, métricas, etc.)
 *   y reutilizar middleware específico.
 */

const express = require("express");
const { healthController } = require("../controllers/health.controller");

// Creamos un nuevo router de Express.
const router = express.Router();

// Definimos la ruta GET /health.
// Cuando alguien hace GET http://localhost:8080/health, Express ejecuta
// healthController(req, res), que devuelve JSON con status y pid.
router.get("/health", healthController);

// Exportamos con el nombre healthRouter para que index.js lo importe.
module.exports = { healthRouter: router };
