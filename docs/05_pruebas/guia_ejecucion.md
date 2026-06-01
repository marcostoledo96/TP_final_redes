# Guía de ejecución de pruebas

## 1. Instalar dependencias

```bash
npm install
```

Requiere Node.js 20+.

## 2. Resetear estado (recomendado antes de cada prueba formal)

```bash
rm -rf data/*.sqlite*
```

## 3. Levantar servidor

```bash
npm start
```

O en modo desarrollo con recarga automática:

```bash
npm run dev
```

## 4. Probar `/health`

```bash
curl http://localhost:8080/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "pid": 12345
}
```

## 5. Probar `/ingest`

```bash
curl "http://localhost:8080/ingest?id=1"
```

Respuesta esperada (cuando el Worker Thread está sano):

```json
{
  "ok": true,
  "status": "accepted",
  "id": 1,
  "pid": 12345
}
```

## 6. Probar ID inválido

```bash
curl "http://localhost:8080/ingest?id=abc"
```

Respuesta esperada:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_QUERY",
    "message": "Query param id must be a positive integer"
  }
}
```

## 7. Probar rechazo 503 (Worker Thread no disponible)

Si el Worker Thread local no está disponible (por ejemplo, se reinició y aún no recuperó), `/ingest` debe devolver 503:

```json
{
  "ok": false,
  "error": {
    "code": "WORKER_UNAVAILABLE",
    "message": "Worker Thread is unavailable; try again later"
  }
}
```

## 8. Abrir dashboard

```txt
http://localhost:8080/dashboard
```

Muestra métricas, eventos y reinicios en una interfaz web sencilla.

## 9. Consultar métricas (JSON)

```bash
curl http://localhost:8080/metrics
```

Muestra métricas locales y globales:

```json
{
  "pid": 12345,
  "localCounter": 0,
  "acceptedEvents": 10,
  "completedEvents": 10,
  "failedEvents": 0,
  "totalRestarts": 0,
  "activeWorkers": 4,
  "globalCounter": 10,
  "totalEvents": 10
}
```

## 10. Correr evaluación de carga

```bash
npm run evaluate
```

Envía 500 peticiones concurrentes a `/ingest` y consulta `/health` en paralelo **mientras se procesan los eventos**. Al finalizar, muestra un resumen con latencias y contadores, y guarda los resultados en `docs/05_pruebas/resultados_pruebas.md`.

## 11. Probar self-healing

1. Identificar PID de un Worker (ver logs de la consola).
2. Ejecutar:

```bash
kill -9 PID_DEL_WORKER
```

3. Verificar que el Primary cree otro Worker.
4. Verificar que se registre el reinicio en SQLite (tabla `worker_restarts`).
5. Verificar que aparezca en el dashboard.

## 12. Probar shutdown ordenado

```bash
kill -TERM PID_DEL_PRIMARY
```

Verificar que el Primary termine sin registrar nuevos reinicios en `worker_restarts`.

## 13. Interpretar resultados

- `/health` debe seguir respondiendo rápido durante la carga (`< 100 ms` máximo, `< 50 ms` promedio).
- Contador final de `completedEvents` debe llegar a 500.
- Drift (`acceptedEvents - completedEvents`) debe ser 0.
- Sin errores en consola del servidor.
- Health checks durante el procesamiento deben ser `> 2`.
