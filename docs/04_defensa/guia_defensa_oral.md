# Guía de estudio para defensa oral — The Guardian

## 1. Resumen del proyecto

**The Guardian** es un micro-orquestador de ingesta y monitoreo reactivo hecho con Node.js.

El sistema recibe eventos mediante:

```txt
GET /ingest?id=4500
```

mantiene un endpoint de monitoreo:

```txt
GET /health
```

y ofrece un dashboard visual:

```txt
GET /dashboard
```

La clave técnica es que el trabajo pesado no se ejecuta en el Event Loop, sino en un Worker Thread fijo.

---

## 2. Qué demuestra el TP

El TP demuestra:

1. Alta concurrencia con `cluster`.
2. Self-healing si un Worker muere.
3. Event Loop limpio.
4. Procesamiento CPU-bound fuera del hilo principal.
5. Memoria compartida con `SharedArrayBuffer`.
6. Incremento seguro con `Atomics.add()`.
7. Agregación global entre procesos usando IPC.
8. Persistencia de métricas con SQLite.
9. Dashboard para visualizar evidencia de funcionamiento.

---

## 3. Arquitectura general

```txt
Primary Process
│
├── Agrega métricas globales
├── Recibe mensajes IPC
├── Escribe en SQLite
├── Registra reinicios
└── Crea/revive Cluster Workers

Cluster Worker
│
├── Express
├── /health
├── /ingest
├── /metrics
├── /dashboard
└── Worker Thread fijo

Worker Thread
│
├── Ejecuta cálculo pesado
├── Usa SharedArrayBuffer
└── Incrementa con Atomics.add()
```

---

## 4. Por qué se usa Express

Express permite organizar el backend en:

- rutas;
- controladores;
- servicios;
- middlewares;
- vistas;
- respuestas JSON.

Esto aplica lo aprendido en Backend y hace que el proyecto sea más mantenible que un servidor HTTP nativo.

---

## 5. Por qué se usa Cluster

`cluster` permite levantar varios procesos Node.js usando el mismo puerto.

En este TP se usa para:

- aprovechar la mitad de los núcleos;
- distribuir carga HTTP;
- mantener disponibilidad;
- aplicar self-healing.

---

## 6. Por qué se usa la mitad de los núcleos

Porque la consigna lo pide mediante una lógica equivalente a:

```js
Math.max(1, Math.floor(os.cpus().length / 2))
```

Esto permite usar varios núcleos sin ocupar toda la máquina y garantiza que, aunque la máquina tenga solo 2 núcleos, se levante al menos 1 Worker.

---

## 7. Qué es self-healing

Self-healing significa que si un Worker del cluster muere, el Primary crea otro automáticamente.

Se implementa con:

```js
cluster.on('exit', () => {
  cluster.fork();
});
```

---

## 8. Qué pasa si un Worker muere con tareas en vuelo

El sistema recupera disponibilidad creando otro Worker.

Pero las tareas que estaban en vuelo podrían perderse o quedar incompletas si no se usa una cola persistente.

Por eso se documenta como limitación. En sistemas reales se resolvería con:

- colas;
- persistencia previa;
- reintentos;
- idempotencia.

---

## 9. Por qué `/health` no se bloquea

Porque `/health` no ejecuta trabajo pesado.

Solo responde:

```json
{
  "status": "ok",
  "pid": 12345
}
```

El cálculo pesado se delega a un Worker Thread.

---

## 10. Por qué `/ingest` responde `202 Accepted`

Porque recibe el evento, valida el ID y delega el procesamiento.

No espera a que termine el cálculo pesado.

Esto mantiene la API reactiva.

---

## 11. Qué es Worker Thread

Un Worker Thread es un hilo separado dentro del proceso Node.js.

Sirve para ejecutar tareas CPU-bound sin bloquear el Event Loop principal.

---

## 12. Diferencia entre Cluster Worker y Worker Thread

| Concepto | Cluster Worker | Worker Thread |
|---|---|---|
| Tipo | Proceso | Hilo |
| Memoria | Separada | Puede compartir memoria |
| Uso en TP | Servidor HTTP | Cálculo pesado |
| Comunicación | IPC | `postMessage` y memoria compartida |

---

## 13. Qué es SharedArrayBuffer

Es un bloque de memoria compartido entre hilos.

En este TP se usa para compartir un contador entre el Cluster Worker y su Worker Thread.

---

## 14. Por qué el buffer tiene 4 bytes

Porque se usa una vista:

```js
Int32Array
```

Un entero de 32 bits ocupa 4 bytes.

---

## 15. Qué hace Atomics.add()

`Atomics.add()` incrementa el contador de forma atómica.

Esto evita race conditions.

---

## 16. Qué es una race condition

Una race condition ocurre cuando dos operaciones concurrentes modifican el mismo dato y el resultado depende del orden exacto de ejecución.

Ejemplo incorrecto:

```js
counter[0]++;
```

Ejemplo correcto:

```js
Atomics.add(counter, 0, 1);
```

---

## 17. Por qué el contador global usa IPC

`SharedArrayBuffer` comparte memoria entre hilos del mismo proceso.

Pero `cluster` crea procesos separados.

Por eso, cada Worker tiene un contador atómico local, y el total global se agrega en el Primary mediante IPC.

---

## 18. Por qué SQLite escribe desde el Primary

SQLite permite múltiples lecturas, pero las escrituras concurrentes desde varios procesos pueden generar bloqueos.

Para evitar problemas:

- los Workers envían mensajes al Primary;
- el Primary centraliza las escrituras;
- los Workers **solo leen** SQLite para mostrar el dashboard;
- SQLite queda como evidencia persistente.

---

## 19. Qué muestra el dashboard

El dashboard muestra:

- estado del sistema;
- PID que respondió;
- eventos aceptados;
- eventos completados;
- eventos fallidos;
- reinicios de Workers;
- últimos eventos;
- últimos reinicios;
- accesos a `/health` y `/metrics`.

Sirve para defender visualmente el funcionamiento.

---

## 20. Por qué no se implementa autenticación

Autenticación y permisos se dejan documentados como mejora futura porque el foco del TP es:

- concurrencia;
- Event Loop;
- Cluster;
- Worker Threads;
- memoria compartida;
- Atomics.

Agregar autenticación completa podría desviar tiempo y riesgo del objetivo principal.

---

## 21. Cómo demostrar el TP

### 1. Levantar servidor

```bash
npm start
```

### 2. Probar health

```bash
curl http://localhost:8080/health
```

### 3. Probar ingest

```bash
curl "http://localhost:8080/ingest?id=1"
```

### 4. Abrir dashboard

```txt
http://localhost:8080/dashboard
```

### 5. Ejecutar evaluación

```bash
npm run evaluate
```

### 6. Probar self-healing

```bash
kill -9 PID_DEL_WORKER
```

---

## 22. Preguntas que puede hacer el profesor

### ¿Por qué no procesaste el cálculo en el endpoint?

Porque bloquearía el Event Loop y afectaría `/health`.

### ¿Por qué usaste Worker Thread?

Para separar el trabajo CPU-bound del servidor HTTP.

### ¿Por qué usaste Cluster?

Para aprovechar núcleos y recuperar Workers caídos.

### ¿Qué diferencia hay entre proceso e hilo?

Un proceso tiene memoria separada. Un hilo comparte memoria dentro del proceso.

### ¿Qué hace Atomics?

Permite operar sobre memoria compartida de forma segura.

### ¿Qué hace IPC?

Permite que procesos separados intercambien mensajes.

### ¿Por qué SQLite?

Para persistir evidencia de eventos, métricas y reinicios.

### ¿Qué limitación tiene SQLite?

Las escrituras concurrentes pueden bloquearse; por eso se centralizan en el Primary.

---

## 23. Frase final para defender

> The Guardian mantiene el Event Loop libre delegando tareas CPU-bound a Worker Threads. Usa Cluster para escalar y recuperarse ante fallos, Atomics para contar de forma segura entre hilos, IPC para agregar resultados entre procesos y SQLite con dashboard para demostrar el comportamiento del sistema.
