# PROMPT.md — Registro del Proceso con Inteligencia Artificial

## A. Declaración
Usé IA: **sí**

---

## B. Herramienta y Modelo Utilizados
- **Herramienta:** Google Antigravity
- **Modelo:** Gemini 3.8 Flash (High)

---

## C. Prompt Inicial Completo (Literal, sin resumir)

```text
Actúa como un instructor de Node.js para principiantes del SENA. Quiero construir un programa de consola llamado "mundos-ia". CONTEXTO: solo conozco estos temas: process.argv, módulos con require, el módulo nativo fs (writeFileSync, readFileSync, existsSync, mkdirSync), path, npm (init, install, scripts), el paquete object-hash, variables de entorno con .env y process.loadEnvFile, async/await con try/catch y el fetch nativo de Node. OBJETIVO: 1. Recibir por parámetros una situación, un mundo y 5 colores, y guardarlos en un objeto JSON en data/mundo_<id>.json. 2. Leer ese JSON y enviarlo con fetch a la API de un modelo de lenguaje para que genere la descripción de una imagen. Guardarla en descripciones/mundo_<id>.txt. 3. Enviar esa descripción con fetch a la API de un modelo de imágenes y guardar la imagen en imagenes/mundo_<id>.jpg. RESTRICCIONES: - No uses dotenv, axios, SDK de proveedores, readline, commander ni frameworks. - Código simple, con comentarios en español numerados ("paso 1", "paso 2"...). - Las API keys se leen del archivo .env y nunca se escriben en el código. - Si el .txt o la imagen ya existen, no vuelvas a llamar a las APIs. - Divide el código en src/index.js, src/mundo.js, src/texto.js y src/imagen.js. SERVICIOS: texto con Pollinations o Groq, imagen con Pollinations, NVIDIA FLUX.1-schnell o Cloudflare. FORMA DE RESPONDER: dame un archivo a la vez, explica cada bloque en 2 líneas y no uses nada que no esté en el CONTEXTO.
```

---

## D. Prompts Siguientes (Los 3 más importantes)

### Iteración 1: Validación estricta de argumentos y cálculo del hash
- **Prompt:**
  > "En `src/mundo.js`, asegúrate de validar que `process.argv` traiga exactamente 7 argumentos, que ninguno esté vacío o tenga solo espacios, y que los 5 colores sean distintos entre sí sin distinguir mayúsculas ni minúsculas. Si falla, debe imprimir un mensaje en español con el ejemplo de uso y asignar `process.exitCode = 1` sin lanzar errores técnicos. Además, el id debe ser los primeros 8 caracteres de `object-hash` sobre `{ situacion, mundo, colores }` sin incluir la fecha."
- **Respuesta de la IA:**  
  La IA implementó `crearMundo(args)` con `new Set(colores.map(c => c.toLowerCase()))` para comparar los 5 colores únicos, recortó con `.trim()`, calculó `objectHash({ situacion, mundo, colores }).slice(0, 8)` y estructuró las funciones `guardarMundo` y `leerMundo`.
- **Qué hice con la respuesta:**  
  Probé los casos borde en terminal (pasando 0 argumentos, colores repetidos como `rojo` y `ROJO`, y cadenas de solo espacios `" "`), confirmando que el programa mostrara el mensaje amigable de ayuda y el código de salida `1`.

### Iteración 2: Manejo de respuestas binarias y Base64 en `src/imagen.js`
- **Prompt:**
  > "Para `src/imagen.js`, implementa la función `generarImagen(descripcion)` de modo que soporte los servicios de la guía: NVIDIA (JSON con `artifacts[0].base64`), Cloudflare (`result.image`) y Pollinations (bytes directos vía GET). ¿Cómo nos aseguramos de guardar la imagen correctamente sin romper el archivo binario?"
- **Respuesta de la IA:**  
  La IA diferenció el flujo según la URL configurada en el `.env`. Para respuestas en JSON extrajo la cadena base64 y la convirtió con `Buffer.from(textoBase64, 'base64')`, mientras que para respuestas binarias crudas (Pollinations) leyó el `arrayBuffer()` y lo convirtió con `Buffer.from(arrayBuffer)`. Enfatizó no pasar el parámetro `'utf-8'` al `fs.writeFileSync`.
- **Qué hice con la respuesta:**  
  Integré la verificación de que `bytes.length > 0` y la comprobación de `finishReason === 'SUCCESS'` para NVIDIA. Guardé la imagen y verifiqué que el archivo `.jpg` se visualizara nítidamente en el explorador de Windows.

### Iteración 3: Prevención de errores de cuota y modelo de razonamiento en Pollinations
- **Prompt:**
  > "Al llamar a Pollinations, la API responde con error 400 'The model exhausted its output token limit before producing an answer' o tarda más de 30 segundos activando el AbortSignal.timeout(30000). ¿Cómo ajustamos el cuerpo de la petición sin violar las reglas del taller?"
- **Respuesta de la IA:**  
  La IA explicó que el modelo predeterminado de Pollinations (`gpt-oss-20b`) es un modelo de razonamiento profundo que genera cadenas de pensamiento extensas. Propuso añadir `max_tokens: 500` y `reasoning_effort: 'low'` en el payload cuando la URL apunte a `pollinations.ai`.
- **Qué hice con la respuesta:**  
  Apliqué ese ajuste condicional en `src/texto.js`. El tiempo de respuesta del modelo pasó de 35 segundos a menos de 1 segundo (670 ms), eliminando los timeouts y completando la descripción con los 5 colores requeridos.

---

## E. Tres Cambios Realizados Sobre lo Entregado por la IA

1. **Eliminación de dependencias externas redundantes:**  
   La IA sugirió inicialmente instalar `dotenv` para leer el archivo `.env`. Lo eliminé y corregí el código para usar el método nativo `process.loadEnvFile()` introducido en Node.js 20.12+, cumpliendo la regla de no usar más paquetes externos aparte de `object-hash`.
2. **Construcción de rutas independientes del directorio de ejecución:**  
   La IA había escrito rutas relativas directas como `'./data'`. Lo corregí usando `path.join(__dirname, '..', 'data')`, `descripciones` e `imagenes` para que el programa funcione correctamente sin importar desde qué carpeta se invoque en la consola.
3. **Mapeo explícito de códigos HTTP a mensajes de negocio en español:**  
   La IA devolvía errores con `error.stack` genéricos. Personalicé los bloques condicionales en `texto.js`, `imagen.js` e `index.js` para detectar códigos `401/403`, `402/429`, `404/410`, `TimeoutError` y `TypeError`, mostrando los mensajes exactos solicitados en la rúbrica (ej. *"La API key no es válida. Revisa tu archivo .env."*).

---

## F. Explicación de una Línea de Código Clave

```javascript
const id = objectHash({ situacion, mundo, colores }).slice(0, 8);
```
**Explicación:**  
La función `objectHash` serializa y calcula una suma criptográfica SHA-1 sobre el objeto que contiene únicamente los datos conceptuales del mundo (la situación, el nombre del mundo y los 5 colores). Con `.slice(0, 8)` extraemos únicamente los primeros 8 caracteres hexadecimales para generar un identificador corto y limpio (como `cba86145`). Al no incluir la fecha ni la hora, garantizamos que si el usuario vuelve a pedir el mismo mundo en el futuro, el ID será idéntico y el programa podrá reutilizar la descripción y la imagen existentes en lugar de volver a gastar cuota de API.

---

## G. Error Resuelto Durante el Desarrollo

- **Mensaje de error:**  
  ```text
  Error: Superaste el límite gratuito. Espera un momento (revisa el encabezado retry-after: 2s).
  ```
- **Causa:**  
  El servicio gratuito sin clave de Pollinations restringe las consultas concurrentes a 1 cada 30-45 segundos por dirección IP pública. Al probar comandos consecutivos rápidamente, la API rechazó la petición con código HTTP 402.
- **Cómo se resolvió:**  
  Se aprovechó este comportamiento para documentar el manejo de errores de límite de cuota exigido en la Parte 5, leyendo dinámicamente la cabecera `retry-after` para informar al usuario de los segundos de espera. Posteriormente se programó un tiempo de espera adecuado para permitir la ejecución exitosa de los dos mundos completos.

