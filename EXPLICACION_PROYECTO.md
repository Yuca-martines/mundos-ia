# Guía Completa de Arquitectura, Código y Conexiones — mundos-ia

Este documento explica al detalle cada archivo del proyecto, cada bloque de código y cómo se conectan entre sí. Su objetivo es servir como material de estudio y preparación para la sustentación del taller.

---

## 1. Mapa de Conexiones y Flujo de Datos

A continuación se muestra cómo se comunican los módulos y cómo viajan los datos desde la consola hasta los archivos generados en disco:

```mermaid
flowchart TD
    Terminal["Terminal: npm start -- &quot;situación&quot; &quot;mundo&quot; c1 c2 c3 c4 c5"] -->|process.argv| Index["src/index.js (Orquestador principal)"]
    
    subgraph Paso 1: Objeto JSON
        Index -->|args| Mundo["src/mundo.js"]
        Mundo -->|crearMundo()| Hash["objectHash({ situacion, mundo, colores }).slice(0, 8)"]
        Hash -->|objeto mundo| GuardarJson["guardarMundo() -> data/mundo_id.json"]
        GuardarJson -->|leerMundo()| LeerJson["fs.readFileSync() + JSON.parse()"]
        LeerJson -->|mundoGuardado| Index
    end

    subgraph Paso 2: Modelo de Lenguaje
        Index -->|¿Existe descripciones/mundo_id.txt?| CheckTxt{fs.existsSync}
        CheckTxt -- Sí --> ReutilizarTxt["Reutiliza texto local (Ahorra cuota)"]
        CheckTxt -- No --> Texto["src/texto.js: describirMundo(mundoGuardado)"]
        Texto -->|POST fetch con timeout 30s| ApiTexto["API de Texto (Pollinations / Groq / NVIDIA)"]
        ApiTexto -->|descripción en inglés| GuardarTxt["fs.writeFileSync(..., 'utf-8')"]
        GuardarTxt --> Index
        ReutilizarTxt --> Index
    end

    subgraph Paso 3: Modelo de Imágenes
        Index -->|¿Existe imagenes/mundo_id.jpg?| CheckJpg{fs.existsSync}
        CheckJpg -- Sí --> ReutilizarJpg["Reutiliza imagen local (Ahorra cuota)"]
        CheckJpg -- No --> Imagen["src/imagen.js: generarImagen(descripcionDesdeTxt)"]
        Imagen -->|fetch con timeout 60s| ApiImagen["API de Imagen (FLUX / Pollinations)"]
        ApiImagen -->|Base64 o ArrayBuffer| Decodificar["Buffer.from(...) -> Bytes binarios"]
        Decodificar --> GuardarJpg["fs.writeFileSync(..., bytes) SIN utf-8"]
        GuardarJpg --> Listo["Listo. Revisa la carpeta imagenes/"]
        ReutilizarJpg --> Listo
    end
```

---

## 2. Explicación Archivo por Archivo

### 2.1 `package.json`
Es el manifiesto del proyecto Node.js.
- **`name` y `version`**: Identifican el paquete (`mundos-ia`, versión `1.0.0`).
- **`main`: `"src/index.js"`**: Indica el punto de entrada principal del programa.
- **`scripts.start`: `"node src/index.js"`**: Permite ejecutar el programa mediante `npm start -- ...`.
- **`dependencies`**: Contiene únicamente `"object-hash": "^3.0.0"`, que es la única librería externa autorizada en las reglas del taller.

---

### 2.2 `.gitignore`, `.env` y `.env.example`
- **`.gitignore`**: Contiene `node_modules/`, `.env`, `data/`, `descripciones/` e `imagenes/`. Evita subir dependencias, archivos generados de prueba y, sobre todo, credenciales secretas a Git.
- **`.env`**: Archivo local donde se almacenan las API keys y URLs de los servicios. **Nunca** se sube al repositorio.
- **`.env.example`**: Plantilla con los nombres de las variables sin claves reales. Esta sí se versiona para que cualquier persona que clone el proyecto sepa qué variables debe configurar.

---

### 2.3 `src/mundo.js` (Módulo del Dominio y Persistencia JSON)

Este módulo tiene una única responsabilidad: **gestionar los datos del mundo**. Valida los parámetros, crea la estructura del objeto y lee/escribe archivos JSON.

#### Bloque 1: Importaciones
```javascript
const fs = require('fs');
const path = require('path');
const objectHash = require('object-hash');
```
- Se importan los módulos nativos `fs` (para manejar el sistema de archivos) y `path` (para crear rutas seguras entre carpetas), y el paquete externo `object-hash`.

#### Bloque 2: Función `crearMundo(args)`
Recibe `args` (que proviene de `process.argv.slice(2)`).
1. **Validación de cantidad**:
   ```javascript
   if (!args || args.length !== 7) { ... process.exitCode = 1; return null; }
   ```
   Exige que lleguen exactamente 7 elementos: situación (1), mundo (2) y 5 colores (3 a 7).
2. **Validación de contenido vacío**:
   ```javascript
   if (typeof args[i] !== 'string' || args[i].trim().length === 0) { ... }
   ```
   Revisa que ningún argumento sea una cadena vacía o contenga solo espacios (`"   "`).
3. **Validación de colores únicos (sin distinguir mayúsculas/minúsculas)**:
   ```javascript
   const coloresMin = colores.map(c => c.toLowerCase());
   const coloresUnicos = new Set(coloresMin);
   if (coloresUnicos.size !== 5) { ... }
   ```
   Convierte los 5 colores a minúsculas y crea una estructura `Set`. Si había colores repetidos (ej. `rojo` y `ROJO`), el `Set` elimina duplicados y su tamaño será menor a 5, activando el mensaje de error.
4. **Cálculo del identificador único (`id`)**:
   ```javascript
   const hash = objectHash({ situacion, mundo, colores });
   const id = hash.slice(0, 8);
   ```
   Se calcula el hash SHA-1 **únicamente** sobre la situación, el mundo y los colores. Se extraen los primeros 8 caracteres.
   > **Importante para sustentación:** Si incluyéramos `creadoEn` dentro del hash, el ID cambiaría cada milisegundo y sería imposible reutilizar los archivos generados.
5. **Retorno del objeto**:
   Devuelve el objeto completo incluyendo la fecha actual en formato ISO: `creadoEn: new Date().toISOString()`.

#### Bloque 3: Función `guardarMundo(mundo)`
```javascript
const dirData = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dirData)) {
  fs.mkdirSync(dirData, { recursive: true });
}
const rutaArchivo = path.join(dirData, `mundo_${mundo.id}.json`);
fs.writeFileSync(rutaArchivo, JSON.stringify(mundo, null, 2), 'utf-8');
```
- Construye la ruta absoluta hacia `data/` usando `__dirname` para que funcione sin importar desde qué carpeta se ejecute la consola.
- Si la carpeta `data/` no existe, la crea con `fs.mkdirSync`.
- Guarda el archivo con formato legible usando `JSON.stringify(..., null, 2)`.

#### Bloque 4: Función `leerMundo(ruta)`
```javascript
const contenido = fs.readFileSync(ruta, 'utf-8');
return JSON.parse(contenido);
```
- Lee el archivo JSON del disco como texto UTF-8 y lo transforma de nuevo a un objeto JavaScript con `JSON.parse`.

---

### 2.4 `src/texto.js` (Módulo del Modelo de Lenguaje)

Se encarga de comunicarse mediante `fetch` con el proveedor de IA de texto (Groq, NVIDIA o Pollinations) para convertir el JSON en una descripción de imagen.

#### Bloque 1: Configuración y Prompt de Sistema
```javascript
const url = process.env.TEXTO_URL;
const apiKey = process.env.TEXTO_API_KEY;
const modelo = process.env.TEXTO_MODELO || 'openai/gpt-oss-20b';
```
- Lee las variables cargadas desde `.env`.
- Define un `systemPrompt` estricto en inglés que exige:
  - Un solo párrafo.
  - Entre 80 y 120 palabras.
  - Descripción de escena, iluminación, composición y estilo artístico.
  - Inclusión obligatoria de los 5 colores.
  - Cero markdown, sin historias ni texto en la imagen.

#### Bloque 2: Petición HTTP (`fetch` nativo)
```javascript
const cuerpo = {
  model: modelo,
  max_tokens: 500,
  messages: [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: JSON.stringify(mundo) }
  ]
};

const respuesta = await fetch(url, {
  method: 'POST',
  headers,
  body: JSON.stringify(cuerpo),
  signal: AbortSignal.timeout(30000)
});
```
- Pasa `JSON.stringify(mundo)` como mensaje del usuario.
- Usa `AbortSignal.timeout(30000)` para cancelar la solicitud automáticamente si el servidor tarda más de 30 segundos.

#### Bloque 3: Mapeo de Códigos de Error HTTP
```javascript
if (!respuesta.ok) {
  if (respuesta.status === 401 || respuesta.status === 403) throw new Error('La API key no es válida. Revisa tu archivo .env.');
  if (respuesta.status === 402 || respuesta.status === 429) throw new Error('Superaste el límite gratuito...');
  if (respuesta.status === 404 || respuesta.status === 410) throw new Error('El modelo o la URL no existen. Revisa tu configuración.');
}
```
- Traduce los códigos técnicos a mensajes comprensibles en español sin exponer claves secretas.

#### Bloque 4: Validación y Recorte de la Descripción
```javascript
let descripcion = datos.choices?.[0]?.message?.content?.trim();
if (!descripcion) throw new Error('El modelo de texto devolvió una respuesta vacía.');
if (descripcion.length > 1500) {
  console.warn('Aviso: La descripción superaba los 1500 caracteres y fue recortada.');
  descripcion = descripcion.slice(0, 1500);
}
```
- Valida que la respuesta contenga texto y la recorta con `.slice(0, 1500)` para no sobrepasar el límite máximo aceptado por los modelos generadores de imágenes.

---

### 2.5 `src/imagen.js` (Módulo del Modelo de Imágenes)

Se encarga de enviar la descripción en texto al servicio de imágenes y devolver los bytes binarios puros del archivo JPEG.

#### Bloque 1: Soporte Multiproveedor
El módulo inspecciona `IMAGEN_URL` para adaptarse a cualquiera de los tres servicios vistos en clase:
1. **Pollinations (GET directo sin clave)**:
   ```javascript
   const endpoint = `${baseUrl}/prompt/${encodeURIComponent(descripcion)}?width=1024&height=1024&nologo=true`;
   const respuesta = await fetch(endpoint, { method: 'GET', signal: AbortSignal.timeout(60000) });
   const arrayBuffer = await respuesta.arrayBuffer();
   bytes = Buffer.from(arrayBuffer);
   ```
   La imagen llega como un flujo binario en el cuerpo de la respuesta HTTP, por lo que se lee con `.arrayBuffer()` y se convierte a `Buffer`.
2. **Cloudflare Workers AI (POST con JSON)**:
   La imagen llega codificada en base64 en `datos.result.image`. Se convierte a bytes con `Buffer.from(textoBase64, 'base64')`.
3. **NVIDIA FLUX.1-schnell (POST con JSON)**:
   Verifica que `artifact.finishReason === 'SUCCESS'` y decodifica `artifact.base64` con `Buffer.from(artifact.base64, 'base64')`.

#### Bloque 2: Validación de Bytes
```javascript
if (!bytes || bytes.length === 0) {
  throw new Error('Los bytes de la imagen generada están vacíos.');
}
return bytes;
```
- Asegura que los datos recibidos no sean nulos ni tengan longitud cero antes de intentar guardarlos.

---

### 2.6 `src/index.js` (Orquestador Principal)

Es el director de orquesta que conecta todos los módulos dentro de la función `async main()`.

#### Paso a paso del flujo:
1. **Carga del `.env`**:
   `process.loadEnvFile()` carga las credenciales al entorno global `process.env`.
2. **Ejecución del Paso 1**:
   - Llama a `crearMundo(args)` de `mundo.js`.
   - Llama a `guardarMundo(mundo)` para crear `data/mundo_<id>.json`.
   - **Regla estricta:** Llama a `leerMundo(rutaJson)` con `fs.readFileSync` para releer los datos desde el archivo guardado en lugar de usar la variable que ya estaba en la memoria RAM.
3. **Ejecución del Paso 2 (con Caché)**:
   - Comprueba `fs.existsSync(rutaTxt)`.
   - Si ya existe: muestra `"Paso 2: la descripción ya existía, no se llamó al modelo de texto."` y lee el archivo.
   - Si no existe: llama a `describirMundo(mundoGuardado)` de `texto.js` y guarda el archivo con `fs.writeFileSync(rutaTxt, descripcion, 'utf-8')`.
4. **Ejecución del Paso 3 (con Caché y Binarios)**:
   - Comprueba `fs.existsSync(rutaJpg)`.
   - Si ya existe: muestra `"Paso 3: la imagen ya existía, no se llamó al modelo de imágenes."`.
   - Si no existe: lee la descripción desde el `.txt`, llama a `generarImagen(descripcionDesdeTxt)` de `imagen.js`, y escribe los bytes con `fs.writeFileSync(rutaJpg, bytesImagen)` (**sin pasar 'utf-8'** para no corromper la imagen).
5. **Bloque `catch` general**:
   - Atrapa errores de timeout (`error.name === 'TimeoutError'`).
   - Atrapa errores de red o DNS (`error instanceof TypeError`).
   - Asigna `process.exitCode = 1` y muestra el mensaje amigable en español.

---

## 3. Tabla Resumen de Conexiones entre Módulos

| Archivo Emisor | Función que Exporta | Archivo Receptor | Qué datos le envía | Qué datos recibe de vuelta |
| :--- | :--- | :--- | :--- | :--- |
| **Consola / CLI** | `process.argv` | `src/index.js` | Arreglo de cadenas | Inicia el programa |
| `src/index.js` | Invoca `crearMundo()` | `src/mundo.js` | `args` (7 argumentos) | Objeto `mundo` estructurado |
| `src/index.js` | Invoca `guardarMundo()` | `src/mundo.js` | Objeto `mundo` | Ruta `data/mundo_<id>.json` |
| `src/index.js` | Invoca `leerMundo()` | `src/mundo.js` | Ruta del archivo JSON | Objeto parseado desde disco |
| `src/index.js` | Invoca `describirMundo()` | `src/texto.js` | Objeto `mundo` releído | Cadena con la descripción (inglés) |
| `src/index.js` | Invoca `generarImagen()` | `src/imagen.js` | Texto de la descripción | `Buffer` con los bytes JPEG |

---

## 4. Preguntas Típicas de Sustentación (Y cómo responderlas)

### P1: "¿Qué pasa si cambio el programa para recibir 3 colores en lugar de 5?"
**Respuesta:**  
En `src/mundo.js`:
1. Cambias la validación de argumentos de `args.length !== 7` a `args.length !== 5` (1 situación + 1 mundo + 3 colores = 5 argumentos).
2. En la validación de colores únicos, cambias `coloresUnicos.size !== 5` a `coloresUnicos.size !== 3`.
3. En `src/texto.js`, actualizas el prompt de sistema para que pida incorporar los 3 colores en lugar de 5.

### P2: "¿Por qué el archivo de imagen no se guarda con 'utf-8'?"
**Respuesta:**  
Una imagen JPEG es un archivo binario. Si usamos `'utf-8'`, Node.js intentará mapear cada byte a caracteres de texto. Aquellos bytes que no correspondan a secuencias UTF-8 válidas serán sustituidos por caracteres inválidos (`\uFFFD`), rompiendo los encabezados binarios y corrompiendo la imagen. Los bytes deben guardarse crudos pasando directamente el `Buffer`.

### P3: "¿Qué pasa si borras solo el archivo `imagenes/mundo_<id>.jpg` y vuelves a ejecutar el programa?"
**Respuesta:**  
El Paso 1 guarda o verifica el JSON. En el Paso 2, `fs.existsSync` detecta que la descripción `.txt` sigue existiendo, por lo que **no llama a la API de texto**. En el Paso 3, al no encontrar la imagen `.jpg`, lee la descripción del archivo `.txt` y llama únicamente a la API de imágenes para regenerar el `.jpg`. El sistema de caché funciona de forma independiente en cada paso.

### P4: "¿Por qué no se incluyó la fecha `creadoEn` en el hash?"
**Respuesta:**  
Porque `new Date().toISOString()` cambia en cada ejecución. Si la fecha formara parte del hash, el identificador (`id`) sería diferente cada vez que ejecutemos el comando con los mismos parámetros, haciendo imposible que el programa detecte que ese mundo ya fue creado y anulando el sistema de ahorro de cuota.

