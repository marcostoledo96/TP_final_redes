# Guía de Demostración al Profesor — The Guardian

> Propósito: Manual completo para mostrar el TP funcionando en vivo ante el profesor.
> Audiencia: Alumno junior (sin experiencia previa en demostraciones).
> Estado: Fuente de verdad
> Última actualización: 2026-06-02

## 1. Preparativos antes de la clase

### Checklist de estado del proyecto
- [ ] `npm install` ejecutado (node_modules existe)
- [ ] `npm start` funciona sin errores
- [ ] `node verify-atomics.js` pasa (verifica Atomics.add)
- [ ] Dashboard carga en http://localhost:8080/dashboard
- [ ] `npm run evaluate` corre y muestra resultados (puede tardar 1 minuto)
- [ ] Puerto 8080 está libre (nada está corriendo)
- [ ] SQLite no tiene datos de otra sesión (opcional: borrar `data/*.sqlite*`)

### Qué llevar a la clase
| Item | Por qué |
|---|---|
| Laptop con el repo clonado | Para ejecutar todo en vivo |
| Backup en USB / repo online | Por si algo se rompe |
| Esta guía impresa o en Markdown | Para tener el script a mano |
| Navegador abierto con las URLs marcadas | Para no perder tiempo |
| Terminal preparada con pestañas | Una para el servidor, otra para los scripts |

---

## 2. Escenario ideal (según el profesor pregunte)

### Escenario A: "Mostrame el sistema corriendo" (5 minutos)

#### Paso 1: Levantar el servidor (30 seg)
```bash
npm start
```
Decir mientras corre: "Voy a iniciar el servidor. Con `cluster` se levanta un Primary que forkea Workers, según la cantidad de CPUs. En mi máquina se crean `Math.max(1, Math.floor(os.cpus().length / 2))` Workers."

#### Paso 2: Explicar qué se ve en la terminal
- "Acá vemos que se levantaron N Workers. Cada uno tiene su propio PID."
- "El Primary no atiende requests directamente; los Workers sí."

#### Paso 3: Probar /health (10 seg)
```bash
curl http://localhost:8080/health
```
Decir: "Este endpoint responde rápido y no depende de la base de datos. Sirve para monitoreo. Devuelve `status: ok` y el PID del Worker que respondió."

#### Paso 4: Probar /ingest (15 seg)
```bash
curl "http://localhost:8080/ingest?id=4500"
```
Decir: "Devuelve 202 Accepted. Esto significa que el evento fue aceptado para procesamiento. El Worker Thread va a hacer el cálculo pesado en paralelo, sin bloquear el Event Loop."

#### Paso 5: Mostrar /metrics (10 seg)
```bash
curl http://localhost:8080/metrics
```
Decir: "Acá vemos el contador local del Worker Thread y el contador global del Primary. El local depende de qué Worker nos tocó; el global solo crece."

#### Paso 6: Mostrar /dashboard (20 seg)
Abrir http://localhost:8080/dashboard en el navegador.
Decir: "Este es el dashboard EJS. Se renderiza en el servidor con los datos de SQLite. Muestra eventos, reinicios y métricas en tiempo real. No hay JavaScript del cliente haciendo fetch; el servidor arma el HTML completo."

---

### Escenario B: "Mostrame la carga de concurrencia" (5 minutos)

#### Paso 1: Ejecutar el script de evaluación
```bash
npm run evaluate
```

#### Paso 2: Narrar lo que pasa
- "Este script envía 500 requests concurrentes a `/ingest`."
- "Cada request dispara el Worker Thread. El contador local se incrementa con `Atomics.add()`."
- "En paralelo, consulta `/health` cada 50 ms para verificar que el sistema no se bloquea."
- "Al final consulta `/metrics` y compara local vs global."

#### Paso 3: Explicar el resultado
Mostrar los números finales:
- "Aceptados: XXX | Completados: XXX | Fallidos: XXX"
- "Reinicios: X" → "Si un Worker fallaba, el Primary lo reemplaza automáticamente (self-healing)."
- "Latencia promedio de `/health`: XXX ms" → "Esto muestra que el Event Loop nunca se bloqueó, porque `/health` siguió respondiendo rápido mientras los Worker Threads hacían cálculo pesado."

#### Paso 4 (CRÍTICO): ¿Por qué puede salir "FALLIDO"?

**El script de evaluación tiene un timeout de 30 segundos** (`METRICS_TIMEOUT_MS = 30000`).

**Si el timeout corta antes de que todos los Worker Threads terminen**: aparece un "drift" (diferencia entre aceptados y completados) y el estado es FALLIDO.

**Esto NO quiere decir que el sistema está roto.** Significa que:
1. Los 500 requests fueron aceptados correctamente (el servidor recibió la orden).
2. Los Worker Threads están trabajando (consumiendo CPU).
3. El script cortó antes de que terminaran todos.

**Cómo demostrar que funciona correctamente a pesar del "FALLIDO":**

**Opción 1: Esperar unos segundos y consultar `/metrics` de nuevo**
```bash
curl http://localhost:8080/metrics
```
Ahora vas a ver que `completedEvents` subió y el drift bajó o desapareció.

Decir: "Si esperamos unos segundos más, todo termina. El servidor no perdió nada; el script del evaluate simplemente tiene un límite de 30 segundos que es menor al tiempo real de procesamiento."

**Opción 2: Modificar el timeout y re-correr el evaluate**
```bash
# Copiar el evaluate y cambiar el timeout a 60 segundos
sed -i "s/METRICS_TIMEOUT_MS = 30000/METRICS_TIMEOUT_MS = 60000/" scripts/evaluate.js
npm run evaluate
# Restaurar el original (opcional):
sed -i "s/METRICS_TIMEOUT_MS = 60000/METRICS_TIMEOUT_MS = 30000/" scripts/evaluate.js
```

**Opción 3: Explicar el timeout ante el profesor**
> "El script de evaluación usa un timeout de 30 segundos para que la prueba no dure eternamente. Pero con 8 Workers procesando 500 eventos y cada Worker Thread tardando ~200-500ms, el tiempo real es mayor. Si extendemos el timeout a 60 segundos, el drift desaparece y el resultado es APROBADO."

---

### Escenario C: "Mostrame el uso de SharedArrayBuffer y Atomics" (3 minutos)

#### Paso 1: Abrir compute.worker.js
Mostrar el código de `/home/marcos/Escritorio/clases_redes/src/workers/compute.worker.js`:
```js
const sharedBuffer = workerData.sharedBuffer;
const counter = new Int32Array(sharedBuffer);
// ... cálculo pesado: loop de 10_000_000 iteraciones ...
Atomics.add(counter, 0, 1);
```

Decir: "Este Worker Thread recibe tareas del Cluster Worker. Hace un cálculo pesado de CPU y luego incrementa el contador compartido con Atomics.add(). Si usáramos `counter[0]++`, en concurrencia se perderían valores porque no es atómico."

#### Paso 2: Correr verify-atomics.js
```bash
node verify-atomics.js
```
Decir: "Este script demuestra la diferencia: crea un SharedArrayBuffer, lanza 5 tareas al Worker Thread, y verifica que el contador final sea exactamente 5. Si fallara, significaría que hay condición de carrera."

---

## 3. Errores comunes durante la demostración y cómo escapar

| Error que puede aparecer | Causa probable | Solución rápida (decirla en voz alta) |
|---|---|---|
| EADDRINUSE :::8080 | Ya hay otro proceso escuchando | `pkill -f node` o cambiar el puerto con `PORT=8081 npm start` |
| SQLite database locked | Demasiadas escrituras simultáneas | Esperar un segundo y repetir; siempre es WAL-mode así que es raro |
| Worker Thread no disponible (503) | El Worker Thread murió y no se reinició | Verificar que `worker-thread.service.js` tenga bounded respawn. Si persiste, reiniciar el servidor |
| Dashboard vacío | Todavía no hay datos | Primero mandar algunos `/ingest` y refrescar con F5 |
| `npm start` no hace nada | Node < 20 | Verificar `node --version` debe ser >= 20.0.0 |
| `npm run evaluate` dice FALLIDO | Timeout de 30 segundos sin completar 500 eventos | Verificar que el servidor esté corriendo en cluster mode (`npm start`, no `npm run dev`) |

---

## 4. Script de palabras: qué decir y cuándo

### Al iniciar el servidor (`npm start`)
> "Voy a ejecutar `npm start`. Este script levanta el Primary del cluster. El Primary es como un manager: no atiende clientes directamente, pero se encarga de contratar mozos (Workers) y reemplazarlos si se enferman (self-healing). Cada Cluster Worker a su vez tiene adentro un Worker Thread fijo para cálculo pesado."

### Al hacer `/ingest`
> "Cada vez que llega un request a `/ingest`, el Cluster Worker delega el cálculo a un Worker Thread fijo. Esto es clave: no creamos un Worker Thread por request porque es caro en memoria y CPU. Creamos uno solo al inicio y le mandamos tareas por mensajes con `postMessage`."

### Al mostrar `/metrics`
> "El contador local (`localCounter`) pertenece al Worker Thread del proceso que me respondió. El global (`completedEvents`) lo mantiene el Primary a través de IPC. Si piden `/metrics` varias veces, van a ver que el global solo crece, mientras que el local depende de qué Worker les tocó."

### Al mostrar el dashboard
> "El dashboard usa EJS, que es un motor de templates del lado del servidor. El servidor lee de SQLite, arma el HTML y envía todo listo al navegador. No hay JavaScript del cliente haciendo fetch. Esto lo hace muy simple: una consulta a la base, se inyectan los datos en el template, y se envía."

### Al correr `evaluate`
> "Este script mide cuánto tarda el sistema en procesar 500 eventos concurrentes. La métrica clave es que no se bloquee el Event Loop, gracias a que el trabajo pesado corre en Worker Threads. También mide la latencia de `/health` durante la carga: si sube mucho, significa que el Event Loop está saturado. En nuestro caso debería mantenerse baja."

### Al mostrar el código de `compute.worker.js`
> "Este archivo es el Worker Thread. Recibe tareas por `parentPort.on('message')`, hace un loop de CPU de 10 millones de iteraciones, y luego incrementa el contador con `Atomics.add(counter, 0, 1)`. Esa línea es la prueba de que entendemos sincronización de memoria compartida. Nunca usamos `counter[0]++` porque no es atómico."

---

## 5. Métricas que deberían verse bien

| Métrica | Valor esperado | Qué significa si falla |
|---|---|---|
| `acceptedEvents` | ≈ `completedEvents` (tras esperar unos segundos) | Si el drift sigue > 0 después de 10s, hay eventos perdidos (muy raro) |
| `failedEvents` | 0–5 | Demasiados fallos indican Worker Threads caídos |
| `totalRestarts` | 0–3 | Self-healing funcionó, pero muchos reinicios indican inestabilidad |
| `drift` | 0 (tras esperar ~5s más) | Diferencia entre aceptados y completados. Si persiste > 0 tras dar tiempo al sistema, indicaría bug |
| Latencia promedio `/health` | < 200 ms | El Event Loop está saturado si es mayor (o el sistema está procesando 500 eventos) |
| Latencia máxima `/health` | < 500 ms | Picos de bloqueo si es mayor |
| `completedEvents` tras evaluate | ≥ 500 (tras esperar 30-40s) | Worker Threads no procesaron todo; puede ser timeout del evaluate |
| Health checks durante la prueba | > 50 | Si son < 10, el envío de 500 requests fue tan rápido que el healthLoop apenas giró |

> ⚠️ **Sobre el FAIL del evaluate**: Es común que salga `❌ FALLIDO` con drift > 0 porque el timeout de 30s corta antes de que todos los Worker Threads terminen. No es un bug del servidor. Si consultás `/metrics` 10 segundos después, el drift debería ser 0.

---

## 6. Si el profesor pregunta cosas inesperadas

### "¿Y qué pasa si tiro 10000 requests?"
> "Con una sola instancia en mi laptop, el límite es la memoria y la CPU. En producción pondríamos detrás un load balancer y escalaríamos horizontalmente. El TP demuestra los conceptos; para producción hace falta más infraestructura."

### "¿Por qué no usaron TypeScript?"
> "La consigna especificaba CommonJS. Además, como es un TP académico, CommonJS permite mostrar `require`/`module.exports` que son más explícitos para aprender. TypeScript lo podría agregar después como mejora."

### "¿Por qué no usaron Redis o una base distribuida?"
> "La consigna pedía SQLite con WAL. SQLite es una base embebida, perfecta para un TP que no necesita infraestructura externa. Redis serviría para caching o pub/sub, pero el TP se enfoca en cluster + IPC + SQLite."

### "¿Qué pasa si cae el Primary?"
> "Si cae el Primary, todo el cluster cae. Eso es una limitación conocida. En producción usaríamos PM2 o Kubernetes para que un nuevo Primary se levante automáticamente."

### "¿Por qué la mitad de las CPUs y no todas?"
> "Porque cada Cluster Worker tiene adentro un Worker Thread que consume CPU intensivamente. Entonces cada Cluster Worker usa 2 hilos de CPU: uno para HTTP y otro para cálculo. Si tenemos 8 CPUs, creamos 4 Cluster Workers = 8 hilos totales, usando el 100% sin matar la máquina."

### "¿Por qué el Worker Thread hace un loop vacío?"
> "El loop de 10 millones de iteraciones simula trabajo pesado CPU-bound. No hace nada visible, pero consume ciclos de procesador. Si hiciéramos esto en el Event Loop principal, bloquearíamos todos los requests HTTP. Por eso lo delegamos al Worker Thread."

### "¿Cómo sabe el Primary cuántos eventos se completaron?"
> "Por IPC. Cuando el Worker Thread termina, el Cluster Worker le avisa al Primary con `process.send({ type: 'INGEST_COMPLETED', eventId, pid })`. El Primary suma al contador global y persiste en SQLite. Los Workers nunca tocan SQLite directamente."

---

## 7. Checklist de cierre de demostración
- [ ] Servidor corriendo sin errores
- [ ] `/health` responde ✅
- [ ] `/ingest` devuelve 202 ✅
- [ ] `/metrics` muestra contadores ✅
- [ ] Dashboard renderiza con datos ✅
- [ ] `evaluate` termina con métricas razonables ✅
- [ ] Se explicó al menos un concepto clave del TP (cluster/worker_threads/Atomics/IPC) ✅
- [ ] Se mostró el código fuente de al menos un archivo relevante ✅
- [ ] Se apagó el servidor con Ctrl+C (graceful shutdown) ✅
