# Clase 2 Backend — Funciones, Arrays, Métodos y práctica Node.js

**Materia:** Desarrollo Web Backend  
**Tema:** JavaScript en Node.js, entorno Browser vs Node.js, objetos globales, timers, módulos CommonJS, módulos nativos, funciones, arrays y práctica integradora.  
**Base:** Apuntes de clase, presentación “Clase 2 - Funciones, Arrays, Métodos” y consigna “Práctica #1”.

---

## 1. Objetivo de la clase

El objetivo de esta clase es reforzar los fundamentos de JavaScript aplicados al desarrollo backend con Node.js.

La clase trabaja dos dimensiones al mismo tiempo:

1. **JavaScript como lenguaje:** variables, objetos, arrays, condicionales, ciclos, funciones, template literals y métodos de arrays.
2. **Node.js como entorno backend:** objetos globales, módulos CommonJS, timers, módulos nativos (`os`, `path`, `fs`, `http`) y diferencias con el navegador.

La idea central es comprender que JavaScript puede ejecutarse en distintos entornos, pero cada entorno ofrece objetos, APIs y responsabilidades diferentes.

---

## 2. Browser vs Node.js

JavaScript puede ejecutarse tanto en el navegador como en Node.js, pero no se comporta exactamente igual porque cada entorno tiene objetos globales distintos.

---

### 2.1. JavaScript en el navegador

El navegador ejecuta JavaScript del lado del cliente.

Su objetivo principal es permitir la interacción con páginas web.

En el navegador existen objetos globales como:

```js
window
document
navigator
location
history
```

Ejemplos:

```js
document.title;
document.body.innerHTML = "<h1>GOOOOGLE</h1>";

window.innerHeight;
window.innerWidth;
```

Estos objetos permiten modificar la interfaz visual, leer información de la ventana del navegador y manipular el DOM.

---

### 2.2. JavaScript en Node.js

Node.js ejecuta JavaScript del lado del servidor.

Su objetivo principal es permitir:

- construir servidores,
- leer y escribir archivos,
- trabajar con rutas,
- acceder a información del sistema operativo,
- crear APIs,
- manejar conexiones de red,
- automatizar tareas,
- organizar código en módulos.

En Node.js no existen `window` ni `document`, porque no hay una ventana de navegador ni un DOM.

En cambio, Node.js ofrece objetos y APIs como:

```js
global
process
module
require
__dirname
__filename
```

Ejemplo:

```js
console.log(process.version);
console.log(__dirname);
console.log(__filename);
```

---

## 3. Diferencias principales entre Browser y Node.js

| Aspecto | Browser | Node.js |
|---|---|---|
| Lugar de ejecución | Cliente | Servidor |
| Objeto global principal | `window` | `global` |
| Manipulación visual | Sí, mediante `document` y DOM | No tiene DOM nativo |
| Acceso al sistema de archivos | Muy limitado o inexistente | Sí, mediante `fs` |
| Acceso al sistema operativo | Limitado | Sí, mediante `os`, `process` |
| Uso principal | Interfaz e interacción del usuario | Backend, servidores, scripts y APIs |
| Módulos | ES Modules o bundlers | CommonJS y ES Modules |
| Red | Peticiones desde cliente | Servidores HTTP, TCP, UDP, APIs |

---

## 4. Variables y tipos de datos en Node.js

En la clase se muestran ejemplos básicos de variables ejecutadas desde Node.js.

```js
let username = 'pepito';
let age = 30;
let hasHobbies = false;
let points = [10, 20, 30];

let user = {
  name: 'Cristina',
  lastname: 'Perez'
};

const PI = 3.1416;

console.log(username);
console.log(age);
console.log(hasHobbies);
console.log(points);
console.log(user);
console.log(PI);
```

---

### 4.1. Tipos usados en el ejemplo

| Variable | Tipo | Descripción |
|---|---|---|
| `username` | String | Cadena de texto |
| `age` | Number | Número |
| `hasHobbies` | Boolean | Verdadero/falso |
| `points` | Array | Lista de valores |
| `user` | Object | Objeto con propiedades |
| `PI` | Number constante | Valor que no debería cambiar |

---

## 5. Condicionales

Los condicionales permiten ejecutar diferentes bloques de código según una condición.

Ejemplo simple:

```js
const age = 30;

if (age >= 30) {
  console.log("Adulto");
} else {
  console.log("Niño");
}
```

Ejemplo con más ramas:

```js
const age = 30;

if (age >= 18) {
  console.log("Adulto");
} else if (age >= 13) {
  console.log("Adolescente");
} else {
  console.log("Niño");
}
```

---

## 6. Arrays y ciclos

Un array permite almacenar varios valores en una sola variable.

```js
const names = ['Juan', 'Pedro', 'Lucas'];

for (let i = 0; i < names.length; i++) {
  console.log(names[i]);
}
```

El ciclo `for` recorre el array desde la posición `0` hasta la última posición.

---

## 7. Funciones

Una función permite encapsular una tarea reutilizable.

```js
function showUserInfo(userName, userAge) {
  return `El usuario es ${userName}, y tiene ${userAge} años de edad`;
}

console.log(showUserInfo('Alan', 34));
```

---

### 7.1. Template literals

Los template literals permiten crear textos dinámicos usando backticks:

```js
const nombre = "Alan";
console.log(`Hola, ${nombre}`);
```

Ventajas:

- permiten insertar variables fácilmente,
- mejoran la legibilidad,
- permiten texto multilínea,
- evitan concatenaciones largas.

---

## 8. Funciones tradicionales y arrow functions

### 8.1. Función tradicional

```js
function sumar(a, b) {
  return a + b;
}
```

### 8.2. Arrow function

```js
const sumar = (a, b) => {
  return a + b;
};
```

Versión abreviada:

```js
const sumar = (a, b) => a + b;
```

---

## 9. Funciones de orden superior

Una función de orden superior, o **HOF** (*High Order Function*), es una función que recibe otra función como argumento o devuelve una función.

Ejemplo:

```js
function operar(a, b, callback) {
  return callback(a, b);
}

const resultado = operar(5, 3, (x, y) => x + y);

console.log(resultado);
```

Esto es importante porque muchos métodos de arrays, como `forEach`, `map` y `filter`, reciben funciones como argumento.

---

## 10. Métodos de arrays

Los arrays son fundamentales para manejar colecciones de datos.

---

### 10.1. `forEach()`

`forEach()` recorre cada elemento del array y ejecuta una función.

```js
const nombres = ['Ana', 'Luis', 'Marcos'];

nombres.forEach((nombre) => {
  console.log(nombre);
});
```

No devuelve un nuevo array. Se usa principalmente para ejecutar una acción por cada elemento.

---

### 10.2. `map()`

`map()` crea un nuevo array transformando cada elemento.

```js
const numeros = [1, 2, 3];

const dobles = numeros.map((numero) => numero * 2);

console.log(dobles); // [2, 4, 6]
```

---

### 10.3. `filter()`

`filter()` crea un nuevo array con los elementos que cumplen una condición.

```js
const edades = [12, 18, 25, 10, 30];

const mayores = edades.filter((edad) => edad >= 18);

console.log(mayores); // [18, 25, 30]
```

---

## 11. Objetos globales en Node.js

Los objetos globales están disponibles en toda la aplicación.

Ejemplos importantes:

```js
console.log(__dirname);
console.log(__filename);
console.log(module);
console.log(require);
```

---

### 11.1. `__dirname`

Devuelve la ruta absoluta del directorio donde se encuentra el archivo actual.

```js
console.log(__dirname);
```

---

### 11.2. `__filename`

Devuelve la ruta absoluta del archivo actual.

```js
console.log(__filename);
```

---

### 11.3. `module`

Representa el módulo actual.

Node.js separa el código en módulos. Cada archivo puede funcionar como un módulo independiente.

```js
console.log(module);
```

---

### 11.4. `require`

Permite importar módulos.

```js
const os = require('os');
```

También permite importar archivos propios:

```js
const math = require('./math');
```

---

## 12. Timers

Node.js permite usar funciones de tiempo como:

- `setTimeout()`
- `setInterval()`
- `clearTimeout()`
- `clearInterval()`

---

### 12.1. `setTimeout()`

Ejecuta una función una sola vez después de un tiempo determinado.

```js
setTimeout(() => {
  console.log('hello world');
}, 5000);
```

Este ejemplo espera 5 segundos y luego imprime el mensaje.

---

### 12.2. `setInterval()`

Ejecuta una función repetidamente cada cierto tiempo.

```js
setInterval(() => {
  console.log('hello world');
}, 2000);
```

Este ejemplo imprime el mensaje cada 2 segundos.

---

## 13. Módulos CommonJS

Node.js permite dividir una aplicación en varios archivos usando módulos.

Esto mejora:

- la organización,
- la reutilización,
- el mantenimiento,
- la separación de responsabilidades,
- la legibilidad del código.

---

### 13.1. Exportación individual

Archivo `myModule.js`:

```js
const myWebAddress = "www.google.com";

module.exports = myWebAddress;
```

Archivo `main.js`:

```js
const web = require('./myModule');

console.log(web);
```

---

### 13.2. Exportación grupal

Archivo `myModule.js`:

```js
const myWebAddress = "www.google.com";
const myNumber = 30;
const myArray = [10, 20, 30];

const myUser = {
  name: "pepito",
  surname: "sonrisas"
};

const group = {
  myWebAddress,
  myNumber,
  myArray,
  myUser
};

module.exports = group;
```

Archivo `main.js`:

```js
const web = require('./myModule');

console.log(web);
```

También se puede desestructurar:

```js
const { myWebAddress, myNumber } = require('./myModule');

console.log(myWebAddress);
console.log(myNumber);
```

---

## 14. Primer módulo matemático

Archivo `math.js`:

```js
function suma(x, y) {
  return x + y;
}

function resta(x, y) {
  return x - y;
}

function producto(x, y) {
  return x * y;
}

function division(x, y) {
  return x / y;
}

const group = {
  suma,
  resta,
  producto,
  division
};

module.exports = group;
```

Archivo `main.js`:

```js
const math = require('./math');

console.log(math.suma(6, 10));
console.log(math.resta(6, 2));
console.log(math.producto(6, 10));
console.log(math.division(9, 3));
```

---

## 15. Módulo `os`

El módulo `os` permite obtener información del sistema operativo.

```js
const os = require('os');

console.table({
  os: os.platform(),
  version: os.release(),
  totalMemory: os.totalmem(),
  freeMemory: os.freemem(),
  uptime: os.uptime()
});
```

---

### 15.1. Métodos importantes

| Método | Descripción |
|---|---|
| `os.userInfo()` | Información del usuario del sistema |
| `os.uptime()` | Tiempo desde que el sistema se encendió |
| `os.platform()` | Plataforma del sistema operativo |
| `os.release()` | Versión del sistema operativo |
| `os.totalmem()` | Memoria total |
| `os.freemem()` | Memoria libre |

---

## 16. Módulo `path`

El módulo `path` permite trabajar con rutas de archivos y directorios.

```js
const path = require('path');

console.log(path.sep);

const filePath = path.join('public', 'styles', 'main.css');

console.log(filePath);
console.log(path.basename(filePath));
console.log(path.dirname(filePath));
console.log(path.extname(filePath));
console.log(path.parse(filePath));
```

---

### 16.1. Métodos importantes

| Método | Descripción |
|---|---|
| `path.join()` | Une partes de una ruta correctamente |
| `path.basename()` | Devuelve el nombre del archivo |
| `path.dirname()` | Devuelve el directorio |
| `path.extname()` | Devuelve la extensión |
| `path.parse()` | Devuelve un objeto con partes de la ruta |
| `path.sep` | Separador de rutas del sistema |

---

## 17. Módulo `fs`

El módulo `fs` permite leer, escribir, crear y eliminar archivos.

---

### 17.1. Lectura sincrónica

```js
const fs = require('fs');

const first = fs.readFileSync('./data/first.txt', 'utf-8');

console.log(first);
```

La versión sincrónica bloquea la ejecución hasta que termine la lectura.

---

### 17.2. Escritura sincrónica

```js
const fs = require('fs');

fs.writeFileSync('./data/third.txt', 'Este es un tercer archivo');

const title = 'Este es un nuevo titulo';
fs.writeFileSync('./data/fourth.txt', title);
```

---

### 17.3. Lectura asincrónica

```js
const fs = require('fs');

fs.readFile('archivo.txt', 'utf-8', function(error, data) {
  if (error) {
    console.log(error);
    return;
  }

  console.log(data);
});
```

La versión asincrónica no bloquea el hilo principal mientras espera la operación de disco.

---

### 17.4. Escritura asincrónica

```js
const fs = require('fs');

fs.writeFile('nuevo_archivo.txt', 'archivo desde FS', (err) => {
  if (err) {
    console.log(err);
    return;
  }

  console.log('Archivo creado correctamente');
});
```

---

## 18. Callback Hell

El callback hell ocurre cuando se encadenan muchas operaciones asincrónicas anidadas.

Ejemplo:

```js
fs.readFile('archivo.txt', function(error, data) {
  if (error) {
    console.log(error);
    return;
  }

  fs.readFile('otro_archivo.txt', function(error, data2) {
    if (error) {
      console.log(error);
      return;
    }

    fs.writeFile('nuevo_archivo.txt', 'archivo desde FS', (err) => {
      if (err) {
        console.log(err);
        return;
      }

      console.log('Proceso terminado');
    });
  });
});
```

Problemas:

- código difícil de leer,
- difícil manejo de errores,
- mucha indentación,
- baja mantenibilidad.

Más adelante se puede mejorar con Promesas y `async/await`.

---

# Práctica #1 — Resolución guiada

Esta práctica integra Browser vs Node.js, timers, módulos, sistema operativo, rutas, archivos, promesas y servidor HTTP.

---

## Ejercicio 1 — Diferencias entre Browser y Node.js

### Consigna

Escribir un script que detecte si se está ejecutando en el navegador o en Node.js y muestre un mensaje adecuado.

Si se ejecuta en Node.js, debe imprimir la versión de Node.js.

### Conceptos

- `global`
- `window`
- `process.version`

### Solución sugerida

Archivo: `01-entorno.js`

```js
if (typeof window !== 'undefined') {
  console.log('El script se está ejecutando en el navegador.');
  console.log(`Alto de ventana: ${window.innerHeight}`);
  console.log(`Ancho de ventana: ${window.innerWidth}`);
} else if (typeof global !== 'undefined' && typeof process !== 'undefined') {
  console.log('El script se está ejecutando en Node.js.');
  console.log(`Versión de Node.js: ${process.version}`);
} else {
  console.log('No se pudo identificar el entorno.');
}
```

### Explicación

En navegador existe `window`. En Node.js existe `global` y también `process`.

---

## Ejercicio 2 — Temporizador con Fecha y Hora

### Consigna

Crear un temporizador que imprima la fecha y hora actual cada segundo y se detenga automáticamente después de 10 segundos.

### Conceptos

- `setInterval()`
- `clearInterval()`
- `Date()`

### Solución sugerida

Archivo: `02-temporizador.js`

```js
let segundos = 0;

const intervalo = setInterval(() => {
  segundos++;

  const ahora = new Date();
  console.log(`[${segundos}] Fecha y hora actual: ${ahora.toLocaleString()}`);

  if (segundos === 10) {
    clearInterval(intervalo);
    console.log('Temporizador detenido después de 10 segundos.');
  }
}, 1000);
```

---

## Ejercicio 3 — Módulo de Conversión de Unidades

### Consigna

Crear un módulo llamado `conversor.js` que convierta:

- metros a kilómetros,
- kilogramos a libras,
- grados Celsius a Fahrenheit.

Luego importar el módulo en otro archivo y usar las funciones.

### Conceptos

- `module.exports`
- `require`
- módulos CommonJS

### Solución sugerida

Archivo: `conversor.js`

```js
function metrosAKilometros(metros) {
  return metros / 1000;
}

function kilogramosALibras(kilogramos) {
  return kilogramos * 2.20462;
}

function celsiusAFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

module.exports = {
  metrosAKilometros,
  kilogramosALibras,
  celsiusAFahrenheit
};
```

Archivo: `03-usar-conversor.js`

```js
const conversor = require('./conversor');

console.log(`1500 metros son ${conversor.metrosAKilometros(1500)} km`);
console.log(`10 kg son ${conversor.kilogramosALibras(10)} lb`);
console.log(`25 °C son ${conversor.celsiusAFahrenheit(25)} °F`);
```

---

## Ejercicio 4 — Información del Sistema Operativo

### Consigna

Escribir un script que muestre:

- sistema operativo,
- cantidad de memoria total,
- cantidad de memoria libre,
- tiempo en que el sistema está encendido.

### Conceptos

- `os.platform()`
- `os.totalmem()`
- `os.freemem()`
- `os.uptime()`

### Solución sugerida

Archivo: `04-sistema.js`

```js
const os = require('os');

function bytesAGigabytes(bytes) {
  return (bytes / 1024 / 1024 / 1024).toFixed(2);
}

console.table({
  sistemaOperativo: os.platform(),
  version: os.release(),
  memoriaTotalGB: bytesAGigabytes(os.totalmem()),
  memoriaLibreGB: bytesAGigabytes(os.freemem()),
  uptimeSegundos: os.uptime(),
  uptimeHoras: (os.uptime() / 60 / 60).toFixed(2)
});
```

---

## Ejercicio 5 — Lectura y Escritura de Archivos en modo asíncrono

### Consigna

Escribir un programa que lea `entrada.txt`, convierta su contenido a mayúsculas y lo guarde en `salida.txt`.

### Conceptos

- `fs.readFile()`
- `fs.writeFile()`
- callbacks

### Solución sugerida

Archivo: `05-archivos-async.js`

```js
const fs = require('fs');

fs.readFile('entrada.txt', 'utf-8', (err, data) => {
  if (err) {
    console.error('Error al leer entrada.txt:', err.message);
    return;
  }

  const contenidoMayusculas = data.toUpperCase();

  fs.writeFile('salida.txt', contenidoMayusculas, (err) => {
    if (err) {
      console.error('Error al escribir salida.txt:', err.message);
      return;
    }

    console.log('Archivo salida.txt generado correctamente.');
  });
});
```

Archivo de prueba: `entrada.txt`

```txt
hola mundo desde node.js
este texto será convertido a mayúsculas
```

---

## Ejercicio 6 — Analizador de Rutas

### Consigna

Escribir un programa que reciba una ruta de archivo y muestre:

- el directorio,
- el nombre del archivo,
- la extensión.

### Conceptos

- `path.dirname()`
- `path.basename()`
- `path.extname()`

### Solución sugerida

Archivo: `06-rutas.js`

```js
const path = require('path');

const rutaArchivo = process.argv[2] || 'public/styles/main.css';

console.log(`Ruta analizada: ${rutaArchivo}`);

console.table({
  directorio: path.dirname(rutaArchivo),
  nombreArchivo: path.basename(rutaArchivo),
  extension: path.extname(rutaArchivo)
});
```

### Ejecución

```bash
node 06-rutas.js public/styles/main.css
```

---

## Ejercicio 7 — Gestión de Directorios

### Consigna

Crear un script que:

1. Cree una carpeta `logs` si no existe.
2. Genere 5 archivos: `log1.txt`, `log2.txt`, `log3.txt`, `log4.txt`, `log5.txt`.
3. Liste todos los archivos de la carpeta `logs`.

### Conceptos

- `fs.mkdirSync()`
- `fs.writeFileSync()`
- `fs.readdir()`

### Solución sugerida

Archivo: `07-crear-logs.js`

```js
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, 'logs');

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
  console.log('Carpeta logs creada.');
} else {
  console.log('La carpeta logs ya existe.');
}

for (let i = 1; i <= 5; i++) {
  const filePath = path.join(logsDir, `log${i}.txt`);
  const content = `Archivo de log número ${i}\nCreado el ${new Date().toISOString()}`;

  fs.writeFileSync(filePath, content);
}

fs.readdir(logsDir, (err, files) => {
  if (err) {
    console.error('Error al leer la carpeta logs:', err.message);
    return;
  }

  console.log('Archivos dentro de logs:');
  files.forEach((file) => console.log(`- ${file}`));
});
```

---

## Ejercicio 8 — Eliminación de Archivos

### Consigna

Crear un programa que elimine todos los archivos dentro de `logs` y luego borre la carpeta.

### Conceptos

- `fs.unlinkSync()`
- `fs.rmdirSync()`

### Solución sugerida

Archivo: `08-eliminar-logs.js`

```js
const fs = require('fs');
const path = require('path');

const logsDir = path.join(__dirname, 'logs');

if (!fs.existsSync(logsDir)) {
  console.log('La carpeta logs no existe. No hay nada para eliminar.');
  process.exit(0);
}

const files = fs.readdirSync(logsDir);

files.forEach((file) => {
  const filePath = path.join(logsDir, file);
  fs.unlinkSync(filePath);
  console.log(`Archivo eliminado: ${file}`);
});

fs.rmdirSync(logsDir);

console.log('Carpeta logs eliminada correctamente.');
```

---

## Ejercicio 9 — Temporizador con Promesa

### Consigna

Implementar una función `esperar(ms)` que espere un tiempo y luego resuelva una promesa.

### Conceptos

- Promesas
- `setTimeout()`
- `async/await`

### Solución sugerida

Archivo: `09-promesa.js`

```js
function esperar(ms) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(`Pasaron ${ms} milisegundos`);
    }, ms);
  });
}

async function main() {
  console.log('Inicio');

  const resultado = await esperar(3000);

  console.log(resultado);
  console.log('Fin');
}

main();
```

---

## Ejercicio 10 — Servidor HTTP con Respuesta Dinámica

### Consigna

Crear un servidor HTTP que devuelva la hora actual en formato JSON.

### Conceptos

- `http.createServer()`
- `res.writeHead()`
- `JSON.stringify()`

### Solución sugerida

Archivo: `10-servidor-http.js`

```js
const http = require('http');

const PORT = 3000;

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    const response = {
      mensaje: 'Servidor HTTP funcionando',
      fecha: new Date().toISOString()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
    return;
  }

  if (req.url === '/hora') {
    const response = {
      horaActual: new Date().toLocaleTimeString(),
      fechaCompleta: new Date().toLocaleString()
    };

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(response));
    return;
  }

  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Ruta no encontrada' }));
});

server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});
```

### Prueba

```bash
node 10-servidor-http.js
```

Luego abrir en el navegador:

```txt
http://localhost:3000
http://localhost:3000/hora
```

---

# Organización recomendada de carpetas

Para practicar de forma ordenada:

```txt
practica-1/
│
├── 01-entorno.js
├── 02-temporizador.js
├── conversor.js
├── 03-usar-conversor.js
├── 04-sistema.js
├── entrada.txt
├── 05-archivos-async.js
├── 06-rutas.js
├── 07-crear-logs.js
├── 08-eliminar-logs.js
├── 09-promesa.js
├── 10-servidor-http.js
│
└── logs/
```

La carpeta `logs/` se crea automáticamente en el ejercicio 7 y se elimina en el ejercicio 8.

---

# Comandos útiles

Ejecutar cada archivo:

```bash
node 01-entorno.js
node 02-temporizador.js
node 03-usar-conversor.js
node 04-sistema.js
node 05-archivos-async.js
node 06-rutas.js public/styles/main.css
node 07-crear-logs.js
node 08-eliminar-logs.js
node 09-promesa.js
node 10-servidor-http.js
```

---

# Relación de la práctica con el TP “The Guardian”

Aunque esta práctica parece introductoria, sirve como base directa para el TP integrador.

| Tema de la práctica | Aplicación futura en el TP |
|---|---|
| Browser vs Node.js | Entender que el TP corre en servidor |
| `process.version` | Verificar Node.js 20 |
| Timers | Medición de latencia y pruebas |
| Módulos CommonJS | Organización del proyecto |
| `os` | Calcular cantidad de núcleos para `cluster` |
| `path` | Manejo de rutas de archivos y docs |
| `fs` | Escritura de logs o evidencias |
| Promesas | Flujo asincrónico limpio |
| HTTP nativo | Base conceptual para Express |
| JSON | Respuestas de `/health` y `/ingest` |

---

# Checklist de aprendizaje

Al terminar esta clase y práctica deberías poder explicar:

- Qué diferencia hay entre ejecutar JavaScript en navegador y en Node.js.
- Por qué `window` existe en browser pero no en Node.js.
- Para qué sirve `global`.
- Qué información ofrece `process`.
- Qué son `__dirname` y `__filename`.
- Cómo funcionan `setTimeout` y `setInterval`.
- Cómo se exporta e importa un módulo con CommonJS.
- Cómo usar módulos nativos como `os`, `path`, `fs` y `http`.
- Qué diferencia hay entre operaciones sincrónicas y asincrónicas.
- Qué es un callback.
- Qué problema genera el callback hell.
- Cómo usar Promesas y `async/await`.
- Cómo crear un servidor HTTP básico que responda JSON.

---

# Preguntas de defensa oral

## 1. ¿Por qué Node.js no tiene `document`?

Porque `document` pertenece al DOM del navegador. Node.js corre del lado del servidor y no tiene una página HTML cargada por defecto.

---

## 2. ¿Qué diferencia hay entre `window` y `global`?

`window` es el objeto global del navegador.  
`global` es el objeto global de Node.js.

---

## 3. ¿Para qué sirve `process.version`?

Sirve para conocer la versión de Node.js que está ejecutando el programa.

---

## 4. ¿Qué ventaja tiene usar módulos?

Permite dividir el código en archivos más pequeños, reutilizables y fáciles de mantener.

---

## 5. ¿Por qué conviene usar `path.join()`?

Porque construye rutas compatibles con el sistema operativo, evitando errores con separadores como `/` o `\`.

---

## 6. ¿Por qué `fs.readFile()` es mejor que `fs.readFileSync()` en un servidor?

Porque `fs.readFile()` es asincrónico y no bloquea el Event Loop mientras espera la lectura del archivo.

---

## 7. ¿Qué hace `setInterval()`?

Ejecuta una función repetidamente cada cierta cantidad de milisegundos.

---

## 8. ¿Qué hace `clearInterval()`?

Detiene un intervalo creado con `setInterval()`.

---

## 9. ¿Qué es una Promesa?

Una Promesa representa una operación asincrónica que puede completarse correctamente o fallar en el futuro.

---

## 10. ¿Qué devuelve el servidor HTTP del ejercicio 10?

Devuelve un objeto JSON con la hora o fecha actual generada dinámicamente por el servidor.

---

# Resumen final

Esta clase consolida los fundamentos iniciales de backend con Node.js.

Se trabaja la diferencia entre JavaScript en navegador y JavaScript en servidor, la importancia de los módulos CommonJS, el uso de módulos nativos y la creación de scripts prácticos para interactuar con el sistema operativo, rutas, archivos, timers y servidores HTTP.

Estos contenidos son esenciales para avanzar hacia proyectos backend más complejos, donde se usarán herramientas como Express, bases de datos, middlewares, rutas, controladores, servicios, validaciones y arquitecturas escalables.
