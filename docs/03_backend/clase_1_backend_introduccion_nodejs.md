# Clase 1 — Introducción al Desarrollo Web Backend con Node.js

**Materia:** Backend / Desarrollo Web Backend  
**Tema central:** fundamentos del backend, relación Front-End/Back-End, Node.js como entorno de ejecución, Event Loop, módulos y APIs.  
**Material base:** `Clase1-Introduccion Backend.pdf`  
**Fecha indicada en la presentación:** 25/03/2025

---

## 1. Objetivo general de la clase

La clase introduce los conceptos fundamentales del **desarrollo web backend** y el rol de **Node.js** como entorno de ejecución para construir aplicaciones del lado del servidor.

El propósito principal es comprender que el backend no es solamente “el servidor”, sino la parte de una aplicación encargada de:

- ejecutar la lógica del negocio;
- recibir y responder solicitudes;
- comunicarse con bases de datos;
- exponer APIs;
- validar y procesar información;
- coordinar la relación con el Front-End;
- garantizar rendimiento, accesibilidad, escalabilidad y mantenimiento.

Esta clase funciona como una base conceptual para las clases siguientes de backend y también se conecta con los contenidos vistos en redes, especialmente con Node.js, Event Loop, I/O no bloqueante, APIs y servidores HTTP.

---

## 2. Temario de la clase

La presentación organiza la clase alrededor de los siguientes temas:

1. Páginas estáticas vs. páginas dinámicas.
2. Aplicación web vs. sitio web.
3. Introducción a Node.js.
4. Coding Live Session.
5. Conceptos en la relación Front-End y Back-End.
6. Accesibilidad y su impacto en el desarrollo backend.

---

# Parte 1 — Páginas estáticas y páginas dinámicas

## 3. Diferencias entre páginas estáticas y dinámicas

Uno de los primeros conceptos de la clase es diferenciar entre una **página estática** y una **página dinámica**.

Esta diferencia es importante porque permite entender cuándo alcanza con mostrar contenido fijo y cuándo se necesita un backend que procese datos, genere respuestas, consulte bases de datos o personalice información para cada usuario.

---

## 3.1. Páginas estáticas

Una página estática es aquella cuyo contenido ya está definido previamente.

Normalmente se compone de archivos como:

- HTML;
- CSS;
- JavaScript del lado del cliente;
- imágenes;
- fuentes;
- recursos estáticos.

El servidor solo entrega esos archivos al navegador. No necesita generar contenido diferente en cada solicitud.

### Características principales

- El contenido está definido antes de que el usuario lo solicite.
- No requiere interacción compleja con el servidor.
- Es más simple de alojar y mantener.
- Tiene menor consumo de recursos del servidor.
- Suele cargar más rápido.
- Es ideal para información que no cambia frecuentemente.

### Ejemplos

- Portfolio personal simple.
- Página institucional básica.
- Landing page.
- Blog simple generado estáticamente.
- Página informativa de un evento.
- Documentación sin login ni personalización.

### Ventajas

- Mayor velocidad de carga.
- Menor costo de hosting.
- Menos complejidad técnica.
- Menor superficie de ataque.
- Fácil despliegue en servicios como GitHub Pages, Netlify o Vercel.

### Limitaciones

- Poca personalización.
- No maneja usuarios ni sesiones por sí sola.
- No suele modificar contenido en tiempo real.
- No permite operaciones complejas sin integrar servicios externos o backend.

---

## 3.2. Páginas dinámicas

Una página dinámica genera contenido en función de la interacción del usuario, datos externos o información procesada por el servidor.

En este caso, el backend puede intervenir para:

- consultar una base de datos;
- validar credenciales;
- generar una respuesta personalizada;
- procesar formularios;
- actualizar información;
- calcular resultados;
- mostrar contenido diferente según el usuario.

### Características principales

- Generan contenido en tiempo real.
- Se ajustan a la interacción del usuario.
- Pueden mostrar información personalizada.
- Requieren más lógica del lado del servidor.
- Pueden depender de bases de datos o APIs.
- Son más complejas que las páginas estáticas.

### Ejemplos

- Red social.
- Tienda online.
- Sistema de turnos.
- Plataforma educativa.
- Home banking.
- Panel administrativo.
- Aplicación con login.
- Sistema de gestión de usuarios.

### Ventajas

- Permiten interacción real con el usuario.
- Pueden manejar sesiones y autenticación.
- Permiten CRUD sobre datos.
- Pueden mostrar contenido actualizado.
- Son la base de aplicaciones web modernas.

### Desventajas

- Mayor complejidad.
- Mayor consumo de recursos.
- Requieren backend, base de datos o servicios externos.
- Tienen más riesgos de seguridad si están mal diseñadas.
- Necesitan mayor mantenimiento.

---

## 3.3. Comparación general

| Característica | Página estática | Página dinámica |
|---|---|---|
| Contenido | Predefinido | Generado o modificado en tiempo real |
| Interacción | Baja | Alta |
| Uso de servidor | Mínimo | Mayor |
| Base de datos | Generalmente no | Frecuentemente sí |
| Personalización | Limitada | Alta |
| Velocidad | Muy rápida | Depende del procesamiento |
| Complejidad | Baja | Media/alta |
| Ejemplos | Portfolio, landing page | Tienda online, red social, dashboard |

---

## 3.4. Idea clave

Una página estática entrega contenido ya preparado.  
Una página dinámica necesita lógica de servidor para construir, transformar o personalizar la respuesta.

Esta diferencia introduce la necesidad de estudiar backend.

---

# Parte 2 — Aplicaciones web y sitios web

## 4. Diferencias entre aplicaciones web y sitios web

La clase también diferencia entre **sitio web** y **aplicación web**.

Aunque muchas veces se usan como sinónimos, no son exactamente lo mismo.

---

## 4.1. Sitio web

Un sitio web es un conjunto de páginas interconectadas que generalmente brindan información.

Su objetivo principal suele ser:

- informar;
- presentar contenido;
- mostrar productos o servicios;
- publicar noticias;
- ofrecer documentación;
- presentar una marca o institución.

### Características

- Puede estar compuesto por muchas páginas HTML.
- Suele tener navegación entre secciones.
- Puede incluir texto, imágenes, videos y enlaces.
- Puede ser estático o dinámico.
- No siempre requiere login.
- No necesariamente permite operaciones complejas.

### Ejemplos

- Wikipedia.
- Blog institucional.
- Sitio de noticias.
- Página de una escuela.
- Sitio de una empresa.
- Portfolio personal.

---

## 4.2. Aplicación web

Una aplicación web es un programa que se ejecuta desde el navegador y permite realizar tareas concretas.

No se limita a mostrar información. Permite al usuario interactuar, modificar datos, crear contenido o ejecutar procesos.

### Características

- Alta interactividad.
- Puede requerir autenticación.
- Permite crear, leer, actualizar y eliminar información.
- Trabaja con datos persistentes.
- Tiene reglas de negocio.
- Necesita coordinación entre Front-End, Back-End y base de datos.

### Ejemplos

- Google Docs.
- Facebook.
- Gmail.
- Sistema de turnos médicos.
- Plataforma de ecommerce.
- Panel administrativo.
- Sistema de gestión escolar.
- Aplicación bancaria.

---

## 4.3. Comparación

| Aspecto | Sitio web | Aplicación web |
|---|---|---|
| Objetivo | Informar o mostrar contenido | Permitir acciones y tareas |
| Interacción | Baja o media | Alta |
| Usuario | Visitante | Usuario activo |
| Login | Puede no tener | Frecuentemente sí |
| Base de datos | Opcional | Muy frecuente |
| Backend | Puede ser simple | Generalmente necesario |
| Ejemplo | Blog | Google Docs |

---

## 4.4. Idea clave

Un sitio web se centra en el contenido.  
Una aplicación web se centra en la interacción y en la ejecución de tareas.

---

# Parte 3 — Relación entre Back-End y Front-End

## 5. Qué es el Back-End

El **Back-End** es la parte del desarrollo web que se encarga de la lógica del servidor y la gestión de datos.

Es la capa que no ve directamente el usuario, pero que sostiene el funcionamiento de una aplicación.

### Responsabilidades principales del Back-End

- Recibir solicitudes HTTP.
- Procesar datos.
- Aplicar reglas de negocio.
- Consultar bases de datos.
- Guardar información.
- Validar datos.
- Manejar autenticación y autorización.
- Exponer APIs.
- Integrarse con servicios externos.
- Responder al Front-End.

### Ejemplo

Cuando un usuario completa un formulario de registro:

1. El Front-End muestra el formulario.
2. El usuario ingresa sus datos.
3. El Front-End envía esos datos al Back-End.
4. El Back-End valida la información.
5. El Back-End guarda el usuario en la base de datos.
6. El Back-End responde si el registro fue exitoso o si hubo errores.

---

## 6. Qué es el Front-End

El **Front-End** es la parte visible de una aplicación web.

Se encarga de:

- la interfaz de usuario;
- la experiencia de usuario;
- la presentación visual;
- formularios;
- botones;
- navegación;
- componentes;
- estilos;
- interacción en el navegador.

### Tecnologías típicas

- HTML.
- CSS.
- JavaScript.
- TypeScript.
- Angular.
- React.
- Vue.
- Bootstrap.
- Tailwind.

---

## 7. Interacción entre Front-End y Back-End

Front-End y Back-End deben comunicarse para que una aplicación funcione de manera completa.

La comunicación suele realizarse mediante **APIs HTTP**.

Ejemplo:

```text
Usuario → Front-End → Request HTTP → Back-End → Base de datos
Usuario ← Front-End ← Response HTTP ← Back-End ← Base de datos
```

### Ejemplo concreto

Un formulario en el Front-End envía datos al Back-End:

```http
POST /usuarios
Content-Type: application/json

{
  "nombre": "Marcos",
  "email": "marcos@example.com"
}
```

El Back-End responde:

```json
{
  "mensaje": "Usuario creado correctamente",
  "id": 123
}
```

---

## 8. Importancia de la colaboración Front-End / Back-End

Una buena colaboración entre ambas partes permite:

- definir correctamente los endpoints;
- acordar formatos de request y response;
- validar datos en ambos lados;
- manejar errores de forma clara;
- mejorar la experiencia de usuario;
- evitar inconsistencias;
- mantener una arquitectura más ordenada.

### Buenas prácticas

- Documentar los endpoints.
- Acordar contratos de datos.
- Usar códigos HTTP correctos.
- Enviar mensajes de error comprensibles.
- Mantener nombres de campos consistentes.
- Separar responsabilidades.

---

# Parte 4 — Accesibilidad web y su impacto en Backend

## 9. Qué es accesibilidad web

La **accesibilidad web** consiste en diseñar y desarrollar sitios y aplicaciones que puedan ser usados por la mayor cantidad de personas posible, incluyendo personas con discapacidades.

La accesibilidad no depende solamente del Front-End. El Back-End también influye.

---

## 10. Por qué la accesibilidad impacta en Backend

Aunque muchas cuestiones de accesibilidad se ven en la interfaz, el Back-End debe asegurar que los datos sean accesibles, coherentes y funcionales para todos los usuarios.

### Áreas donde el Back-End influye

- Estructura de datos.
- Mensajes de error.
- Validaciones.
- Respuestas claras.
- Estados HTTP correctos.
- Compatibilidad con tecnologías de asistencia.
- Disponibilidad de información alternativa.
- Seguridad sin barreras innecesarias.
- Rendimiento y tiempos de respuesta.

---

## 11. Compatibilidad con tecnologías de asistencia

Las tecnologías de asistencia incluyen herramientas como:

- lectores de pantalla;
- navegación por teclado;
- magnificadores;
- comandos por voz;
- dispositivos adaptados.

El Back-End contribuye cuando entrega información bien estructurada, consistente y comprensible.

### Ejemplo

Un error poco accesible sería:

```json
{
  "error": "Invalid input"
}
```

Un error más claro sería:

```json
{
  "error": "El campo email es obligatorio y debe tener un formato válido.",
  "field": "email"
}
```

---

## 12. Cumplimiento de normativas

La clase menciona la importancia de cumplir normas como **WCAG**.

WCAG significa **Web Content Accessibility Guidelines**, un conjunto de pautas internacionales para mejorar la accesibilidad del contenido web.

Aunque muchas pautas son visuales o de interacción, el Back-End ayuda a cumplirlas cuando:

- responde con datos claros;
- permite que el Front-End muestre errores accesibles;
- evita procesos confusos;
- asegura tiempos de respuesta razonables;
- no rompe flujos de navegación.

---

## 13. Beneficios de una buena accesibilidad

La accesibilidad aporta beneficios técnicos, humanos y comerciales:

- Mejora la experiencia de usuario.
- Permite que más personas usen el sistema.
- Reduce barreras.
- Mejora la calidad del producto.
- Ayuda al cumplimiento normativo.
- Abre oportunidades de mercado.
- Favorece prácticas inclusivas.

---

# Parte 5 — Introducción a Node.js

## 14. Qué es Node.js

Node.js es un entorno de ejecución para JavaScript que permite ejecutar código del lado del servidor.

Tradicionalmente, JavaScript se ejecutaba principalmente en el navegador. Node.js permite usar JavaScript fuera del navegador, por ejemplo para:

- crear servidores web;
- construir APIs;
- manejar archivos;
- conectarse a bases de datos;
- automatizar tareas;
- trabajar con red;
- crear herramientas de línea de comandos;
- ejecutar procesos backend.

---

## 15. Node.js como entorno de ejecución

Un **entorno de ejecución** es una plataforma que permite ejecutar programas o scripts.

En el contexto de Node.js, el entorno permite ejecutar JavaScript en el servidor.

### Componentes importantes

- Motor V8.
- Librerías internas de Node.js.
- APIs nativas.
- Event Loop.
- libuv.
- Sistema de módulos.
- npm.

---

## 16. Ventajas de Node.js

La presentación destaca varias ventajas de Node.js:

- Permite usar JavaScript en el servidor.
- Unifica el lenguaje entre Front-End y Back-End.
- Tiene una arquitectura basada en eventos.
- Maneja múltiples conexiones simultáneas de forma eficiente.
- Cuenta con una comunidad activa.
- Tiene un ecosistema amplio de paquetes mediante npm.
- Es ideal para aplicaciones escalables y en tiempo real.

---

## 17. Historia e impacto de Node.js

Node.js fue creado por **Ryan Dahl** en 2009 como un entorno de ejecución para JavaScript del lado del servidor.

Desde su lanzamiento, tuvo un crecimiento muy importante en popularidad y uso profesional.

### Impacto

- JavaScript pasó a ser usado también en backend.
- Se impulsó el desarrollo full stack con un mismo lenguaje.
- Surgieron frameworks como Express.js.
- Se fortaleció el ecosistema de paquetes npm.
- Node.js se convirtió en una tecnología clave para APIs, microservicios y aplicaciones en tiempo real.

---

## 18. Node.js y el concepto Cross-Platform

Node.js es **cross-platform**, lo que significa que puede ejecutarse en distintos sistemas operativos.

Ejemplos:

- Windows.
- Linux.
- macOS.

### Ventajas del enfoque cross-platform

- Mayor flexibilidad.
- Más facilidad para trabajar en distintos entornos.
- Menor costo de desarrollo.
- Posibilidad de ejecutar el mismo proyecto en diferentes sistemas.
- Mejor accesibilidad para equipos con distintos sistemas operativos.

---

# Parte 6 — Funcionamiento interno de Node.js

## 19. Motor V8

Node.js utiliza el motor **V8**, desarrollado por Google, para ejecutar código JavaScript.

V8 compila JavaScript a código máquina, lo que mejora la velocidad de ejecución.

### Funciones principales de V8

- Analizar el código JavaScript.
- Compilarlo.
- Optimizarlo.
- Ejecutarlo.
- Administrar parte de la memoria.
- Participar en la recolección de basura.

---

## 20. V8: eficiencia y versatilidad

La presentación presenta a V8 como un motor eficiente, versátil y de código abierto.

### Características destacadas

- Desarrollado por Google.
- Código abierto.
- Compatible con múltiples plataformas.
- Alto rendimiento.
- Integrado en Node.js.
- Capaz de compilar JavaScript a código máquina.

---

## 21. Consumo de memoria en Node.js

Node.js administra memoria durante la ejecución de una aplicación.

La memoria se asigna cuando el programa crea objetos, buffers, funciones, estructuras de datos y otros recursos.

Cuando esa memoria deja de usarse, puede ser liberada mediante el proceso de **Garbage Collection**.

---

## 22. Garbage Collection

La **recolección de basura** es un proceso automático que libera memoria que ya no está siendo utilizada por el programa.

### Importancia

- Evita fugas de memoria en muchos casos.
- Mejora la estabilidad.
- Reduce el riesgo de saturación.
- Permite optimizar el rendimiento.

### Aclaración importante

Garbage Collection no significa que el programador pueda olvidarse de la memoria. Un mal diseño puede seguir generando problemas, por ejemplo:

- referencias guardadas innecesariamente;
- arrays que crecen sin límite;
- listeners no removidos;
- buffers retenidos;
- cachés sin limpieza;
- procesos que cargan demasiados datos en RAM.

---

## 23. Ciclo de vida de la memoria

El ciclo básico de la memoria puede resumirse así:

```text
Asignación → Uso → Liberación / recolección
```

Ejemplo:

```js
function crearDatos() {
  const datos = { nombre: "Backend", activo: true };
  return datos;
}
```

En este ejemplo se crea un objeto en memoria. Mientras existan referencias a ese objeto, no podrá ser eliminado. Cuando deja de ser alcanzable, el Garbage Collector puede liberarlo.

---

## 24. libuv

**libuv** es una biblioteca esencial para Node.js.

La presentación la describe como una biblioteca que abstrae operaciones de entrada y salida, eventos y soporte para TCP/UDP.

### Funciones principales

- Manejo del Event Loop.
- Operaciones de I/O.
- Gestión de eventos.
- Soporte para sockets TCP.
- Soporte para sockets UDP.
- Compatibilidad multiplataforma.
- Soporte para operaciones asíncronas.
- Base fundamental para el modelo no bloqueante de Node.js.

---

## 25. Por qué libuv es importante

Sin libuv, Node.js no podría funcionar como lo hace actualmente.

libuv permite que Node.js:

- no bloquee el hilo principal mientras espera I/O;
- gestione múltiples conexiones;
- trabaje con red de forma eficiente;
- use mecanismos distintos según el sistema operativo;
- mantenga una API relativamente uniforme para el desarrollador.

---

## 26. Funcionamiento general de Node.js

La presentación resume el funcionamiento de Node.js a partir de varias ideas:

- Usa el motor V8 de Google.
- Tiene un modelo de E/S no bloqueante.
- Permite ejecución asincrónica.
- Es ideal para aplicaciones en tiempo real.
- Puede manejar muchas conexiones simultáneas.
- Usa Event Loop para coordinar tareas.

---

## 27. Event Loop

El **Event Loop** es el mecanismo que permite a Node.js administrar operaciones asincrónicas.

Su función es revisar eventos pendientes y ejecutar callbacks cuando las operaciones terminan.

### Explicación simple

1. Llega una solicitud.
2. Node.js inicia una operación.
3. Si la operación es lenta, la delega.
4. El Event Loop queda disponible para otras tareas.
5. Cuando la operación termina, se encola un callback.
6. El Event Loop ejecuta ese callback cuando puede.

---

## 28. Event Loop y concurrencia

El Event Loop permite concurrencia sin crear un hilo nuevo por cada conexión.

Esto mejora el uso de recursos porque Node.js no necesita miles de hilos para miles de conexiones I/O-bound.

### Ventajas

- Mejor rendimiento en operaciones de red.
- Menor consumo de memoria.
- Manejo eficiente de múltiples solicitudes.
- Modelo adecuado para APIs y aplicaciones en tiempo real.

### Riesgo

Si se ejecuta una tarea pesada de CPU dentro del hilo principal, el Event Loop se bloquea.

Ejemplo de mala práctica:

```js
app.get("/bloqueante", (req, res) => {
  let i = 0;
  while (i < 500_000_000) i++;
  res.send("Listo");
});
```

Este endpoint bloquearía el servidor mientras dure el bucle.

---

## 29. Protocolo FIFO en la gestión de tareas

FIFO significa:

```text
First In, First Out
```

Es decir:

```text
Primero en entrar, primero en salir.
```

La clase lo usa para explicar cómo las tareas pueden organizarse en una cola.

### Idea general

- Las tareas llegan.
- Se ubican en una cola.
- Se procesan en orden de llegada.
- Se garantiza un criterio justo y predecible.

### Relación con Event Loop

Las operaciones de I/O y eventos se organizan en colas. El Event Loop toma tareas pendientes según su ciclo interno.

Aclaración: el Event Loop real tiene varias fases y colas, por lo que no todo Node.js funciona como una única cola FIFO simple. Sin embargo, FIFO sirve como modelo inicial para entender que las tareas se encolan y se atienden posteriormente.

---

# Parte 7 — Sistema de módulos de Node.js

## 30. Qué son los módulos

Los módulos son partes del código que pueden separarse para facilitar la organización y reutilización.

Un módulo puede contener:

- funciones;
- clases;
- constantes;
- configuración;
- lógica de negocio;
- conexión a base de datos;
- rutas;
- controladores;
- middlewares.

---

## 31. Ventajas de usar módulos

- Mejor organización.
- Reutilización de código.
- Mayor mantenibilidad.
- Separación de responsabilidades.
- Facilidad para hacer cambios.
- Menor duplicación.
- Trabajo en equipo más ordenado.

---

## 32. Ejemplo de módulo en CommonJS

Como en las clases se trabaja con Node.js clásico, se puede usar CommonJS.

Archivo `math.js`:

```js
function sumar(a, b) {
  return a + b;
}

module.exports = { sumar };
```

Archivo `app.js`:

```js
const { sumar } = require("./math");

console.log(sumar(2, 3));
```

---

## 33. Organización básica de un proyecto backend

Una estructura simple podría ser:

```text
proyecto-backend/
├── app.js
├── package.json
├── routes/
│   └── usuarios.routes.js
├── controllers/
│   └── usuarios.controller.js
├── services/
│   └── usuarios.service.js
└── docs/
    └── clase-1-introduccion-backend.md
```

---

# Parte 8 — APIs en Node.js

## 34. Qué es una API

Una **API** es una interfaz de programación que permite la comunicación entre diferentes aplicaciones, módulos o servicios.

En backend, una API suele exponer endpoints que el Front-End u otros sistemas pueden consumir.

Ejemplo:

```http
GET /usuarios
POST /usuarios
GET /usuarios/15
PUT /usuarios/15
DELETE /usuarios/15
```

---

## 35. Importancia de las APIs

Las APIs permiten:

- reutilizar lógica;
- conectar sistemas;
- separar Front-End y Back-End;
- integrar servicios externos;
- facilitar el desarrollo modular;
- crear aplicaciones web, móviles o de escritorio usando el mismo backend.

---

## 36. APIs nativas de Node.js

Node.js incluye APIs nativas para tareas importantes.

La presentación menciona:

- manipulación de archivos;
- creación de servidores HTTP;
- acceso a red;
- asincronía.

---

## 37. Manipulación de archivos

Node.js puede leer y escribir archivos usando módulos como `fs`.

Ejemplo:

```js
const fs = require("fs");

fs.writeFile("log.txt", "Hola backend", (err) => {
  if (err) {
    console.error("Error al escribir archivo:", err);
    return;
  }

  console.log("Archivo escrito correctamente");
});
```

---

## 38. Creación de servidores HTTP

Node.js puede crear servidores HTTP con el módulo nativo `http`.

Ejemplo:

```js
const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ status: "ok" }));
});

server.listen(3000, () => {
  console.log("Servidor escuchando en http://localhost:3000");
});
```

---

## 39. Acceso a la red

Node.js proporciona herramientas para realizar solicitudes de red y manejar protocolos.

Ejemplos:

- HTTP.
- TCP.
- UDP.
- DNS.
- TLS.
- Streams de red.

Esto conecta directamente con el curso de redes, donde Node.js se usa para trabajar con `net`, `dgram`, buffers, sockets y transporte de datos.

---

## 40. Asincronía

Muchas APIs de Node.js están diseñadas para ser asincrónicas.

Esto mejora la eficiencia porque evita bloquear la aplicación mientras se espera una operación lenta.

Ejemplo:

```js
console.log("Inicio");

setTimeout(() => {
  console.log("Timer terminado");
}, 1000);

console.log("Fin");
```

Salida esperada:

```text
Inicio
Fin
Timer terminado
```

---

# Parte 9 — Node.js y el futuro del desarrollo backend

## 41. Crecimiento de Node.js

La presentación cierra destacando que Node.js continúa creciendo y evolucionando.

Razones:

- Comunidad activa.
- Actualizaciones constantes.
- Buen rendimiento.
- Ecosistema amplio.
- Compatibilidad multiplataforma.
- Uso extendido en aplicaciones modernas.

---

## 42. Innovaciones y características nuevas

Node.js evoluciona incorporando mejoras como:

- mejor rendimiento;
- nuevas APIs;
- mejores herramientas de diagnóstico;
- compatibilidad con estándares modernos;
- mejoras en seguridad;
- soporte para nuevos modelos de desarrollo;
- integración con ecosistemas modernos.

---

## 43. Capacidad para aplicaciones modernas

Node.js se adapta a necesidades modernas como:

- microservicios;
- APIs REST;
- aplicaciones en tiempo real;
- sistemas de chat;
- paneles administrativos;
- servidores web;
- herramientas CLI;
- automatizaciones;
- integraciones con servicios externos.

---

## 44. Comunidad y soporte

La comunidad de Node.js es amplia y activa.

Esto permite:

- encontrar documentación;
- usar paquetes de npm;
- aprender con ejemplos;
- resolver problemas frecuentes;
- participar en proyectos open source;
- acelerar el desarrollo.

---

# Parte 10 — Relación con el TP “The Guardian”

Aunque esta clase pertenece al tramo de backend, sus conceptos se pueden aplicar directamente al TP de redes **“The Guardian”**.

## 45. Conceptos útiles para el TP

| Concepto de esta clase | Aplicación en el TP |
|---|---|
| Back-End | El TP construye un servicio backend que expone endpoints. |
| APIs | `/health` e `/ingest` son endpoints consumibles por clientes. |
| Node.js | El proyecto se implementa con Node.js 20. |
| Event Loop | Debe mantenerse libre para que `/health` responda rápido. |
| Asincronía | Se debe evitar bloquear el hilo principal. |
| Módulos | El proyecto debe organizarse en archivos separados. |
| Accesibilidad | Los errores de la API deben ser claros y consistentes. |
| Cross-platform | El proyecto debería poder correr en Windows/Linux/macOS. |
| libuv | Explica cómo Node.js maneja I/O y red por debajo. |
| V8 | Ejecuta el código JavaScript del proyecto. |

---

## 46. Decisiones confirmadas para el TP

A partir de las decisiones tomadas para el proyecto:

| Decisión | Elección |
|---|---|
| Estilo de módulos | CommonJS, como en los ejemplos de clase |
| Versión de Node.js | Node.js 20 |
| Framework HTTP | Express |
| Script de evaluación | Node.js |
| Respuesta de `/ingest` | Recomendada: rápida, con `202 Accepted` |
| Contador global | A definir técnicamente según alcance y defensa |

---

## 47. Recomendación para `/ingest`

Para proteger el Event Loop, se recomienda que `/ingest` responda rápido con `202 Accepted`.

Esto significa:

> La API recibió la tarea y la delegó correctamente al Worker Thread, pero no espera a que termine todo el cálculo pesado para responder.

Ejemplo:

```json
{
  "accepted": true,
  "id": 4500,
  "pid": 12345
}
```

Esta decisión ayuda a mantener baja la latencia del servidor HTTP y permite defender que el procesamiento pesado fue movido fuera del hilo principal.

---

## 48. Tema pendiente: contador global

La consigna pide un conteo exacto usando `SharedArrayBuffer` y `Atomics.add()`.

El punto delicado es que:

- `SharedArrayBuffer` comparte memoria entre hilos dentro de un mismo proceso.
- `cluster` crea procesos separados.
- Los procesos del cluster no comparten memoria directamente.

Por eso, una defensa técnica sólida debería explicar una de estas dos opciones:

### Opción A — Contador local por proceso + agregación por IPC

Cada proceso Worker tiene su propio `SharedArrayBuffer` con su Worker Thread.  
El Master recolecta métricas por IPC y suma los contadores.

Ventaja:

- Respeta el modelo real de `cluster`.
- Es más fácil de implementar.
- Es defendible desde la arquitectura de procesos.

Desventaja:

- El contador atómico no es físicamente único para todos los procesos.
- El total global se obtiene agregando métricas.

### Opción B — Un solo proceso HTTP + pool de Worker Threads con SharedArrayBuffer global

Se evita `cluster` para el contador global real, pero no cumpliría completamente la parte de balanceo con `cluster`.

### Opción C — Arquitectura híbrida defendible

Usar `cluster` para disponibilidad HTTP y, dentro de cada Worker, un Worker Thread fijo con contador atómico local.  
Luego exponer una ruta o canal IPC para consultar y agregar el total.

Esta opción suele ser la más equilibrada para cumplir la consigna y explicar el límite real de la memoria compartida entre procesos.

---

# Parte 11 — Posibles preguntas de defensa

## 49. ¿Qué es Backend?

Es la parte de la aplicación que maneja la lógica del servidor, procesa solicitudes, administra datos, se comunica con bases de datos y expone APIs para que otros sistemas o el Front-End puedan interactuar.

---

## 50. ¿Qué es Node.js?

Node.js es un entorno de ejecución que permite correr JavaScript fuera del navegador, especialmente del lado del servidor.

---

## 51. ¿Qué es el Event Loop?

Es el mecanismo que permite a Node.js coordinar tareas asincrónicas, eventos, timers y operaciones de I/O sin bloquear el hilo principal.

---

## 52. ¿Por qué no hay que bloquear el Event Loop?

Porque si el hilo principal queda ocupado con una tarea CPU-bound, el servidor no puede responder otras solicitudes, aunque estén relacionadas con endpoints simples como `/health`.

---

## 53. ¿Qué diferencia hay entre Front-End y Back-End?

El Front-End es la interfaz visible del usuario.  
El Back-End procesa datos, aplica reglas de negocio, consulta bases de datos y responde al Front-End mediante APIs.

---

## 54. ¿Qué es una API?

Es una interfaz que permite que dos sistemas se comuniquen. En backend, normalmente se implementa mediante endpoints HTTP.

---

## 55. ¿Qué rol cumple Express?

Express simplifica la creación de servidores HTTP, rutas, middlewares y respuestas en Node.js.

---

## 56. ¿Por qué usar módulos?

Para organizar el código, separar responsabilidades, reutilizar funciones y facilitar el mantenimiento.

---

## 57. ¿Qué relación tiene esta clase con el TP?

El TP consiste en construir un backend con Node.js que expone una API, mantiene el Event Loop libre, usa módulos, responde solicitudes HTTP y aplica conceptos de concurrencia vistos en redes.

---

# Parte 12 — Checklist de estudio

Antes de avanzar a la próxima clase, conviene poder responder:

- [ ] ¿Qué diferencia hay entre una página estática y una dinámica?
- [ ] ¿Qué diferencia hay entre un sitio web y una aplicación web?
- [ ] ¿Qué tareas corresponden al Back-End?
- [ ] ¿Qué tareas corresponden al Front-End?
- [ ] ¿Cómo se comunican Front-End y Back-End?
- [ ] ¿Qué es Node.js?
- [ ] ¿Qué es V8?
- [ ] ¿Qué es libuv?
- [ ] ¿Qué es el Event Loop?
- [ ] ¿Qué significa I/O no bloqueante?
- [ ] ¿Qué es FIFO?
- [ ] ¿Qué son los módulos en Node.js?
- [ ] ¿Qué es una API?
- [ ] ¿Qué APIs nativas ofrece Node.js?
- [ ] ¿Por qué Node.js es útil para backend?
- [ ] ¿Cómo se conecta esta clase con el TP de redes?

---

# Parte 13 — Resumen final

La clase 1 de Backend introduce los fundamentos necesarios para entender cómo se construye una aplicación del lado del servidor.

Los puntos más importantes son:

1. Las páginas estáticas muestran contenido predefinido.
2. Las páginas dinámicas generan contenido según datos, interacción o lógica de servidor.
3. Un sitio web se centra más en información.
4. Una aplicación web se centra más en interacción y tareas.
5. El Back-End maneja lógica, datos, APIs y reglas de negocio.
6. El Front-End maneja interfaz, experiencia de usuario e interacción visual.
7. Node.js permite ejecutar JavaScript en el servidor.
8. V8 ejecuta y optimiza JavaScript.
9. libuv permite I/O no bloqueante y soporte de red.
10. El Event Loop permite manejar concurrencia sin crear un hilo por conexión.
11. Los módulos ayudan a organizar el código.
12. Las APIs permiten que sistemas y capas se comuniquen.
13. La accesibilidad también involucra al Back-End mediante respuestas claras, datos consistentes y buen rendimiento.
14. Estos conceptos son base directa para implementar y defender proyectos backend como “The Guardian”.

---
