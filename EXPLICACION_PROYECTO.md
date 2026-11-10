# Explicación Completa del Código y Conexiones — mundos-ia

Este documento explica de forma clara, sencilla y paso a paso cómo funciona cada archivo del proyecto, qué hace cada bloque de código, cómo se comunican entre sí y qué debes decir en tu sustentación.

---

## 1. Arquitectura General y Flujo del Programa

El programa sigue una arquitectura modular en **4 archivos de código** dentro de la carpeta `src/`. Cada archivo tiene una única responsabilidad bien definida:

```text
[Terminal: argumentos]
       │
       ▼
 ┌──────────────┐
 │ src/index.js │ ◄── Punto de entrada: coordina todo el proceso
 └──────┬───────┘
        │
        ├─► [Paso 1] Llama a src/mundo.js ──► Valida parámetros y guarda data/mundo_<id>.json
        │
        ├─► [Paso 2] Llama a src/texto.js ──► Pide la descripción a Groq y guarda descripciones/mundo_<id>.txt
        │
        └─► [Paso 3] Llama a src/imagen.js ──► Pide la imagen a Pollinations y guarda imagenes/mundo_<id>.jpg
```

### Servicios de Inteligencia Artificial que estamos usando:
1. **Para el Texto (Paso 2):** **Groq** (`https://api.groq.com/openai/v1/chat/completions`) con el modelo `openai/gpt-oss-20b`.  
   - *¿Por qué Groq?* Es la más rápida del mundo (responde en menos de 1 segundo), utiliza la API Key segura desde `.env` (`TEXTO_API_KEY`) y cumple con el estándar de OpenAI.
2. **Para la Imagen (Paso 3):** **Pollinations** (`https://image.pollinations.ai/prompt/...`) que corre el modelo **FLUX.1**.  
   - *¿Por qué Pollinations?* Es gratuita y recibe la descripción directamente por la URL mediante una petición `GET`, devolviendo los bytes del archivo JPG sin enredos de Base64.

---

## 2. Dónde y Cómo se Conectan los Archivos

La conexión entre archivos se realiza con el sistema nativo de Node.js **CommonJS** (`require` y `module.exports`).

| Archivo que envía | Qué función exporta | Archivo que lo recibe | Qué datos viajan entre ellos |
| :--- | :--- | :--- | :--- |
| `src/mundo.js` | `crearMundo(args)` | `src/index.js` | Recibe los 7 argumentos de la consola y devuelve el objeto JSON con el id hash. |
| `src/mundo.js` | `guardarMundo(mundo)` | `src/index.js` | Recibe el objeto del mundo y lo escribe en `data/mundo_<id>.json`. |
| `src/mundo.js` | `leerMundo(ruta)` | `src/index.js` | Lee el archivo JSON guardado en disco con `readFileSync` y lo convierte a objeto. |
| `src/texto.js` | `describirMundo(mundo)` | `src/index.js` | Recibe el objeto leído del JSON, consulta a Groq y devuelve la descripción en inglés. |
| `src/imagen.js` | `generarImagen(descripcion)` | `src/index.js` | Recibe el texto de la descripción, consulta la API y devuelve un `Buffer` con los bytes binarios de la imagen. |

---

## 3. Explicación Bloque por Bloque de Cada Archivo

---

### Archivo 1: `src/index.js` (El Orquestador)
Es el archivo principal que se ejecuta con `npm start`.

* **Bloque de importaciones (Líneas 1 a 6):**  
  Importa `fs` y `path` de Node.js, y las funciones de los otros tres módulos locales (`mundo.js`, `texto.js`, `imagen.js`).
* **Bloque de carga de variables de entorno (Líneas 8 a 17):**  
  Ejecuta `process.loadEnvFile()`. Esto lee el archivo secreto `.env` y carga las variables en `process.env`. Si el `.env` no existe, muestra un mensaje de ayuda y detiene el programa.
* **Paso 1: Validación y Creación del Mundo (Líneas 23 a 34):**  
  - Toma los argumentos que el usuario escribió con `process.argv.slice(2)`.
  - Llama a `crearMundo(args)`. Si los datos son inválidos, se detiene.
  - Guarda el JSON con `guardarMundo(mundo)`.
  - **Requisito del taller:** Vuelve a leer el mundo desde el archivo con `leerMundo(rutaJson)` para asegurar que se use lo guardado en disco y no lo que estaba en la memoria RAM.
* **Paso 2: Descripción y Sistema de Caché (Líneas 39 a 52):**  
  - Comprueba si el archivo `descripciones/mundo_<id>.txt` ya existe con `fs.existsSync`.
  - **Si ya existe:** Muestra `"Paso 2: la descripción ya existía, no se llamó al modelo de texto."` y lee el texto local.
  - **Si no existe:** Llama a `describirMundo(mundoGuardado)`, guarda el texto con `fs.writeFileSync(..., 'utf-8')` y avisa al usuario.
* **Paso 3: Generación de Imagen y Guardado Binario (Líneas 57 a 73):**  
  - Comprueba si el archivo `imagenes/mundo_<id>.jpg` ya existe con `fs.existsSync`.
  - **Si ya existe:** Muestra `"Paso 3: la imagen ya existía, no se llamó al modelo de imágenes."`.
  - **Si no existe:** Lee la descripción del archivo `.txt`, llama a `generarImagen(descripcionDesdeTxt)` y guarda los bytes con `fs.writeFileSync(rutaJpg, bytesImagen)` (**sin pasar 'utf-8'**, para no romper los bytes de la imagen).
* **Bloque Catch de Errores (Líneas 77 a 88):**  
  Atrapa cualquier fallo en la ejecución y muestra mensajes claros en español (sin códigos técnicos incomprensibles) como: `"El servicio tardó demasiado en responder"` o `"No se pudo conectar. Revisa tu internet o la URL"`.

---

### Archivo 2: `src/mundo.js` (Manejo de Datos y Hash)

* **Bloque `crearMundo(args)`:**
  1. *Validación de cantidad:* `args.length !== 7`. Obliga a pasar situación, mundo y exactamente 5 colores.
  2. *Validación de vacíos:* Recorre cada argumento con un ciclo `for` comprobando que ninguno sea una cadena vacía ni contenga solo espacios (`.trim().length === 0`).
  3. *Validación de colores únicos:* Pasa los colores a minúsculas y crea un `new Set(coloresMin)`. Si el tamaño del `Set` es menor a 5, significa que el usuario repitió un color.
  4. *Cálculo del ID:*  
     ```javascript
     const hash = objectHash({ situacion, mundo, colores });
     const id = hash.slice(0, 8);
     ```  
     Calcula el hash SHA-1 con la librería `object-hash` y toma los primeros 8 caracteres.  
     **Punto clave para sustentación:** La fecha `creadoEn` **NO** se incluye en el hash; si la incluyéramos, el ID cambiaría en cada segundo y el sistema de caché no funcionaría.
* **Bloque `guardarMundo(mundo)`:**  
  Crea la carpeta `data/` si no existe (`fs.mkdirSync`) y escribe el archivo `mundo_<id>.json` formateado con `JSON.stringify(mundo, null, 2)`.
* **Bloque `leerMundo(ruta)`:**  
  Lee el texto del archivo con `fs.readFileSync(ruta, 'utf-8')` y lo transforma de vuelta a objeto con `JSON.parse`.

---

### Archivo 3: `src/texto.js` (Conexión con Groq)

* **Lectura de variables:**  
  Lee `process.env.TEXTO_URL` (`https://api.groq.com/openai/v1/chat/completions`) y `process.env.TEXTO_API_KEY` (tu clave de Groq).
* **Mensaje de Sistema (System Prompt):**  
  Instruye al modelo en inglés para que actúe como un diseñador de prompts, obligándolo a devolver:
  - Un solo párrafo de entre 80 y 120 palabras.
  - Estilo visual, composición e iluminación.
  - Mención de los 5 colores del mundo.
  - Cero markdown, cero títulos y cero historias.
* **Petición `fetch`:**  
  Envía el JSON con método `POST` y la cabecera `Authorization: Bearer <API_KEY>`. Usa `AbortSignal.timeout(30000)` para cancelar si tarda más de 30 segundos.
* **Manejo de estados HTTP:**  
  Si la respuesta no es `ok`, traduce los códigos: 401/403 (clave inválida), 402/429 (límite de cuota), 404/410 (URL o modelo inexistente).
* **Recorte de seguridad:**  
  Si la respuesta supera los 1500 caracteres, la recorta con `.slice(0, 1500)` para que la API de imágenes no falle por texto demasiado largo.

---

### Archivo 4: `src/imagen.js` (Conexión con Pollinations)

* **Construcción del endpoint:**  
  Toma la descripción generada y la codifica con `encodeURIComponent(descripcion)` para poder enviarla de forma segura dentro de la URL:
  ```javascript
  const endpoint = `${baseUrl}/prompt/${encodeURIComponent(descripcion)}?width=1024&height=1024&nologo=true`;
  ```
* **Petición `fetch`:**  
  Hace una petición `GET` directa con `AbortSignal.timeout(60000)` (60 segundos porque generar una imagen toma más tiempo que generar texto).
* **Conversión a Bytes binarios:**  
  ```javascript
  const arrayBuffer = await respuesta.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);
  ```
  Lee la respuesta no como texto, sino como memoria binaria (`ArrayBuffer`) y la transforma en un `Buffer` de Node.js.
* **Validación:**  
  Comprueba que `bytes.length > 0` para asegurar que el archivo de imagen no quede dañado o en blanco.

---

## 4. Archivos de Configuración

* **`package.json`**: Contiene la configuración de inicio (`"scripts": { "start": "node src/index.js" }`) y la única dependencia externa autorizada: `"object-hash"`.
* **`.gitignore`**: Excluye `node_modules/`, `.env` y las carpetas `data/`, `descripciones/` e `imagenes/`.
* **`.env` (Privado):** Contiene tu clave real de Groq y las URLs de los servicios. **Nunca** se sube a GitHub.
* **`.env.example` (Público):** Contiene la plantilla de configuración sin claves reales para que cualquiera que clone el proyecto sepa cómo configurarlo.

---

## 5. Preguntas Clave para tu Sustentación

1. **¿Por qué usamos Groq para texto y Pollinations para imagen?**  
   *Respuesta:* Groq es la opción más rápida del mercado, responde en menos de 1 segundo y nos permite usar la API Key de forma segura desde el `.env`. Para la imagen usamos Pollinations porque nos entrega directamente los bytes del JPG sin necesidad de decodificar Base64 ni pagar créditos.
2. **¿Por qué la imagen no se guarda con `'utf-8'`?**  
   *Respuesta:* Porque una imagen es un archivo binario. Si le pasamos `'utf-8'`, Node.js intentará convertir los bytes a letras de texto, corrompiendo la cabecera del JPG y haciendo que la imagen no se pueda abrir.
3. **¿Cómo funciona el ahorro de cuota?**  
   *Respuesta:* Con `fs.existsSync`. Antes de llamar a cada API, el programa verifica si ya existe el `.txt` o el `.jpg`. Si existen, se salta la llamada a internet y reutiliza los archivos locales.
4. **¿Por qué el ID no lleva la fecha?**  
   *Respuesta:* Porque la fecha cambia en cada segundo de ejecución. Si estuviera en el hash, el ID siempre sería diferente y nunca se podrían reutilizar los archivos existentes.
