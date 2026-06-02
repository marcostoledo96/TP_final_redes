// ===== SECCIÓN: app.js — Fábrica de la aplicación Express =====
/**
 * ¿Qué es esto?
 *   Este archivo es como el "plan" o "molde" para crear una app Express.
 *   No levanta el servidor (eso lo hace server.js), sino que arma todas
 *   las piezas: middleware, motor de vistas, rutas, y manejo de errores.
 *
 * ¿Por qué existe?
 *   Separar "configuración de la app" de "inicio del servidor" es una
 *   buena práctica llamada "separation of concerns" (separación de responsabilidades).
 *   Así podemos probar la app sin levantar un puerto real.
 *
 * Analogía:
 *   Imaginá que Express es un restaurante. Este archivo configura la cocina,
 *   los menús, las reglas de atención y los mozos. server.js es el que
 *   abre la puerta al público y empieza a recibir clientes.
 */

const express = require("express");
const path = require("path");

// Importamos las rutas desde src/routes/index.js.
// mountRoutes es una función que registra todas las rutas en la app.
const { mountRoutes } = require("./routes");

// Importamos middlewares globales:
// - notFoundMiddleware: qué responder cuando alguien pide una URL que no existe (404).
// - errorMiddleware: qué responder cuando explota algo inesperado (500).
const { notFoundMiddleware } = require("./middlewares/not-found.middleware");
const { errorMiddleware } = require("./middlewares/error.middleware");

/**
 * Crea y configura una instancia de Express.
 *
 * ¿Qué hace?
 *   Configura middleware, motor de vistas EJS, archivos estáticos
 *   y monta todas las rutas del TP.
 *
 * ¿Por qué existe como función?
 *   Para que podamos crear múltiples apps en tests sin levantar servidores reales.
 *   Es muy útil para testing automático (aunque acá no lo usemos mucho).
 *
 * @returns {import("express").Application} La app Express lista para usar.
 */
function createApp() {
  // Creamos la instancia base de Express.
  const app = express();

  // ===== MIDDLEWARE: express.json() =====
  // Este middleware le dice a Express: "cuando llegue un body JSON,
  // parsealo y guardalo en req.body". En este TP no usamos POST con body,
  // pero es buena práctica tenerlo por si acaso.
  app.use(express.json());

  // ===== VISTAS: Configuración de EJS =====
  // EJS es un motor de plantillas. Permite escribir archivos .ejs que mezclan
  // HTML estático con JavaScript dinámico (sintaxis <%= variable %>).
  // Express va a buscar las vistas en la carpeta "views".
  app.set("view engine", "ejs");
  app.set("views", path.join(__dirname, "views"));

  // ===== ARCHIVOS ESTÁTICOS =====
  // Todo lo que esté en la carpeta "public" se sirve tal cual.
  // Si alguien pide GET /css/dashboard.css, Express lo busca en
  // public/css/dashboard.css y lo devuelve. No pasa por rutas ni controllers.
  app.use(express.static(path.join(__dirname, "..", "public")));

  // ===== RUTAS =====
  // Conectamos todas las rutas definidas en src/routes/index.js.
  // A partir de acá, los endpoints como /health, /ingest, /metrics y /dashboard
  // están disponibles.
  mountRoutes(app);

  // ===== MIDDLEWARE FINALES =====
  // Estos van DESPUÉS de todas las rutas porque actúan como "red de seguridad":
  //
  // 1. Si ninguna ruta capturó el request, cae en notFoundMiddleware → 404.
  // 2. Si alguna ruta explotó (lanzó un error), Express salta directamente
  //    a errorMiddleware (porque tiene 4 parámetros: err, req, res, next).
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);

  return app;
}

// Exportamos la función para que server.js (o los tests) la usen.
module.exports = { createApp };
