# Guía del script de evaluación

## Ubicación

```txt
scripts/evaluate.js
```

## Requisitos

- Node.js 20+.
- Servidor corriendo en `http://localhost:8080`.
- Dependencias instaladas (`npm install`).

## Resetear estado antes de correr

```bash
rm -rf data/*.sqlite*
```

Luego iniciar el servidor:

```bash
npm start
```

## Qué mide

El script de evaluación ejecuta una prueba de carga completa que verifica:

1. **Concurrencia**: 500 peticiones concurrentes a `/ingest?id=<i>`.
2. **Resiliencia**: consultas en paralelo a `/health` **mientras se procesan los eventos** (health checks continúan hasta que `completedEvents >= 500` o timeout de 30 s).
3. **Latencia**: promedio y máxima de `/health`.
   - Umbral esperado: promedio `< 50 ms`, máxima `< 100 ms`.
4. **Contador global**: verifica que `completedEvents >= 500` con polling y timeout de 30 s.
5. **Drift**: diferencia entre `acceptedEvents` y `completedEvents`. Debe ser 0.
6. **Health checks**: cantidad total de health checks realizados durante el procesamiento.

## Flujo del script

```txt
1. Enviar 500 requests concurrentes a GET /ingest?id=1..500
2. En paralelo, consultar /health cada ~50 ms
3. Medir tiempo de respuesta de cada /health
4. Hacer polling a /metrics hasta que completedEvents >= 500 o timeout 30s
5. Detener health checks
6. Calcular:
   - total aceptados
   - total rechazados
   - promedio de latencia de /health
   - máxima latencia de /health
   - eventos aceptados/completados globales
   - drift
   - cantidad de health checks
7. Imprimir resumen en consola y guardar en docs/05_pruebas/resultados_pruebas.md
```

## Ejemplo de salida

```txt
=== The Guardian — Evaluación de Carga ===

Peticiones enviadas:      500
Peticiones aceptadas:     500
Peticiones rechazadas:    0
Health checks:            120 (OK: 120)
Latencia /health promedio: 12.34 ms
Latencia /health máxima:   45.67 ms
Eventos aceptados global: 500
Eventos completados global: 500
Drift:                    0

Estado:                   ✅ APROBADO
```

## Cómo ejecutar

```bash
npm run evaluate
```

O directamente:

```bash
node scripts/evaluate.js
```

También se puede apuntar a otro host:

```bash
BASE_URL=http://localhost:8080 node scripts/evaluate.js
```

## Notas

- El script usa `fetch` nativo de Node.js 20.
- Las peticiones se envían con `Promise.all` para simular concurrencia real.
- Las latencias se miden con `performance.now()`.
- Los resultados se guardan automáticamente en `docs/05_pruebas/resultados_pruebas.md`.
- Si `completedEvents` no llega a 500 dentro de 30 s, el script termina con `❌ FALLIDO`.
- No existe otro script de verificación (`verify-concurrency.js` fue removido).
