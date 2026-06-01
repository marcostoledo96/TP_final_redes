# Decisiones técnicas finales — The Guardian

## 1. Dashboard

**Decisión:** implementar dashboard simple con EJS.

**Motivo:** facilita la defensa ante el profesor porque permite ver métricas, eventos y reinicios sin depender solamente de la terminal.

---

## 2. SQLite

**Decisión:** usar SQLite con `better-sqlite3`.

**Motivo:** permite persistir evidencia de funcionamiento: eventos aceptados, eventos completados, fallos y reinicios.

---

## 3. Escrituras centralizadas en Primary

**Decisión:** solo el Primary escribe en SQLite.

**Motivo:** evita problemas de escrituras concurrentes desde múltiples procesos del cluster.

**Aclaración:** los Workers no tocan SQLite para escribir, pero sí pueden leer las tablas para renderizar el dashboard. Cada Worker abre su propia conexión de lectura temporal.

---

## 4. IPC en Primary

**Decisión:** los Cluster Workers reportan eventos completados al Primary mediante IPC.

**Motivo:** `cluster` usa procesos separados. El contador global necesita agregación entre procesos.

---

## 5. GET /ingest

**Decisión:** implementar como principal `GET /ingest?id=...`.

**Motivo:** la consigna muestra `/ingest?id=4500` y pide el ID por Query String. Aunque menciona GET o POST, GET alcanza para cumplir.

---

## 6. POST /ingest

**Decisión:** no implementarlo inicialmente.

**Motivo:** no es necesario para cumplir y agrega superficie extra. Puede agregarse como mejora opcional si queda tiempo.

---

## 7. Autenticación y permisos

**Decisión:** dejarlo documentado como mejora futura.

**Motivo:** el foco del TP es redes, concurrencia, Event Loop, cluster, Worker Threads y Atomics. Implementar autenticación completa puede desviar el alcance.

---

## 8. Worker Thread fijo

**Decisión:** un Worker Thread fijo por Cluster Worker.

**Motivo:** la consigna pide no crear un hilo nuevo por cada request y evitar overhead.

---

## 9. SharedArrayBuffer local por proceso

**Decisión:** cada Cluster Worker tiene su propio `SharedArrayBuffer`.

**Motivo:** `SharedArrayBuffer` comparte memoria entre hilos del mismo proceso, no entre procesos separados de cluster.

---

## 10. Contador global por IPC

**Decisión:** el total global se calcula en el Primary sumando mensajes de completado.

**Motivo:** es la solución más defendible para combinar Cluster y Worker Threads respetando los límites reales del modelo de memoria.
