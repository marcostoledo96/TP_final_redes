// ===== SECCIÓN: dashboard.routes.js — Ruta del Dashboard =====
/**
 * Define la ruta GET /dashboard.
 *
 * ¿Qué devuelve?
 *   NO es JSON; devuelve HTML renderizado por EJS (un template engine).
 *   El controller llama a res.render("dashboard", data) y Express
 *   busca src/views/dashboard.ejs, le pasa los datos, y devuelve HTML.
 */

const express = require("express");
const { dashboardController } = require("../controllers/dashboard.controller");

const router = express.Router();

// GET /dashboard → renderiza la vista EJS con métricas, eventos y reinicios.
router.get("/dashboard", dashboardController);

module.exports = { dashboardRouter: router };
