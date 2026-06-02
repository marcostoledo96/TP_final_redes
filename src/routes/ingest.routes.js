// ===== SECCIÓN: ingest.routes.js — Ruta de Ingest =====
/**
 * Define la ruta GET /ingest con middleware de validación.
 *
 * ¿Qué es un middleware?
 *   En Express, un middleware es una función que se ejecuta ANTES del controller
 *   final. Puede modificar el request, validar datos, loguear, etc.
 *   Si el middleware decide que algo está mal, puede detener la cadena y
 *   responder un error (como 400 Bad Request).
 *
 * ¿Por qué validateIngestQuery va antes del controller?
 *   Porque queremos verificar que el query param "id" exista y sea un número
 *   entero positivo ANTES de que llegue al controller. Si no es válido,
 *   respondemos 400 inmediatamente sin tocar la lógica de negocio.
 */

const express = require("express");
const { ingestController } = require("../controllers/ingest.controller");
const { validateIngestQuery } = require("../middlewares/validate-ingest-query.middleware");

const router = express.Router();

// GET /ingest?id=4500
// Primero pasa por validateIngestQuery (valida que id sea número entero > 0).
// Si pasa la validación, llega a ingestController (encola la tarea en Worker Thread).
router.get("/ingest", validateIngestQuery, ingestController);

module.exports = { ingestRouter: router };
