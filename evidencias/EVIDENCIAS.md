# Registro de Evidencias — mundos-ia

Este documento consolida las evidencias de ejecución, validación, pruebas de errores y experimentos de publicación requeridos por el taller.

---

## 1. Ejecución completa de dos mundos distintos

### Mundo 1: Aerópolis
**Comando ejecutado:**
```bash
npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta
```

**Salida en consola:**
```text
Paso 1: mundo guardado en data/mundo_cba86145.json
Paso 2: descripción guardada en descripciones/mundo_cba86145.txt
Paso 3: imagen guardada en imagenes/mundo_cba86145.jpg
Listo. Revisa la carpeta imagenes/
```

**Archivos generados:**
- JSON: `data/mundo_cba86145.json` (respaldado en `evidencias/mundo_cba86145.json`)
- Descripción: `descripciones/mundo_cba86145.txt` (respaldado en `evidencias/mundo_cba86145.txt`)
- Imagen: `imagenes/mundo_cba86145.jpg` (respaldada en `evidencias/mundo_cba86145.jpg`)

---

### Mundo 2: Cristalia
**Comando ejecutado:**
```bash
npm start -- "Un eclipse solar eterno despierta a los titanes de cristal subterráneos" "Cristalia, un cañón de minerales bioluminiscentes en las profundidades" turquesa magenta ambar negro plateado
```

**Salida en consola:**
```text
Paso 1: mundo guardado en data/mundo_032f78d7.json
Paso 2: descripción guardada en descripciones/mundo_032f78d7.txt
Paso 3: imagen guardada en imagenes/mundo_032f78d7.jpg
Listo. Revisa la carpeta imagenes/
```

**Archivos generados:**
- JSON: `data/mundo_032f78d7.json` (respaldado en `evidencias/mundo_032f78d7.json`)
- Descripción: `descripciones/mundo_032f78d7.txt` (respaldado en `evidencias/mundo_032f78d7.txt`)
- Imagen: `imagenes/mundo_032f78d7.jpg` (respaldada en `evidencias/mundo_032f78d7.jpg`)

---

## 2. Reutilización de archivos (Caché y ahorro de cuota)

Al ejecutar el comando de un mundo cuyos archivos ya fueron generados, el programa detecta la existencia de la descripción y la imagen, omitiendo las llamadas a las APIs externas:

**Comando ejecutado (Segunda vez):**
```bash
npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta
```

**Salida en consola:**
```text
Paso 1: mundo guardado en data/mundo_cba86145.json
Paso 2: la descripción ya existía, no se llamó al modelo de texto.
Paso 3: la imagen ya existía, no se llamó al modelo de imágenes.
Listo. Revisa la carpeta imagenes/
```

---

## 3. Errores provocados y explicados en español

### Error A: Clave inválida o sin permisos (HTTP 401 / 403)
- **Causa:** Se configuró una clave de API inexistente o errónea (`clave_invalida_123`).
- **Salida en consola:**
  ```text
  Paso 1: mundo guardado en data/mundo_cba86145.json
  La API key no es válida. Revisa tu archivo .env.
  ```
- **Código de salida:** `1`.

### Error B: URL o modelo inexistente (HTTP 404 / 410)
- **Causa:** Se configuró una ruta de API inexistente (`https://api.groq.com/openai/v1/chat/inexistente`).
- **Salida en consola:**
  ```text
  Paso 1: mundo guardado en data/mundo_cba86145.json
  El modelo o la URL no existen. Revisa tu configuración.
  ```
- **Código de salida:** `1`.

### Error C: Sin conexión o URL mal escrita (TypeError en fetch)
- **Causa:** Se configuró un dominio que no resuelve por DNS (`https://servidor-que-no-existe-xyz999.com/api`).
- **Salida en consola:**
  ```text
  Paso 1: mundo guardado en data/mundo_cba86145.json
  No se pudo conectar. Revisa tu internet o la URL.
  ```
- **Código de salida:** `1`.

### Error D: Superación de límite de cuota (HTTP 402 / 429)
- **Causa:** Se realizaron solicitudes consecutivas sobrepasando la ventana de rate-limit.
- **Salida en consola:**
  ```text
  Paso 1: mundo guardado en data/mundo_cba86145.json
  Superaste el límite gratuito. Espera un momento (revisa el encabezado retry-after: 2s).
  ```
- **Código de salida:** `1`.

### Error E: Tiempo de espera agotado (TimeoutError)
- **Causa:** El servidor tardó más de 30 segundos (`AbortSignal.timeout(30000)`).
- **Salida en consola:**
  ```text
  Paso 1: mundo guardado en data/mundo_cba86145.json
  El servicio tardó demasiado en responder.
  ```
- **Código de salida:** `1`.

---

## 4. Experimento: npm publish --dry-run con y sin .gitignore

### Con `.gitignore` (Comportamiento correcto y seguro):
```text
npm warn gitignore-fallback No .npmignore file found, using .gitignore for file exclusion.
npm notice package: mundos-ia@1.0.0
npm notice Tarball Contents
npm notice 382B .env.example
npm notice 858B README.md
npm notice 443B package.json
npm notice 5.3kB src/imagen.js
npm notice 3.6kB src/index.js
npm notice 3.5kB src/mundo.js
npm notice 3.3kB src/texto.js
npm notice total files: 7
```
*Resultado:* Los archivos sensibles (`.env`) y las carpetas de datos generados (`data/`, `descripciones/`, `imagenes/`) quedan excluidos de la publicación.

### Sin `.gitignore` (Simulado renombrando a `.gitignore.off`):
```text
npm notice package: mundos-ia@1.0.0
npm notice Tarball Contents
npm notice 159B .env
npm notice 382B .env.example
npm notice 51B .gitignore.off
npm notice 858B README.md
npm notice 297B data/mundo_cba86145.json
npm notice 443B package.json
npm notice 5.3kB src/imagen.js
npm notice 3.6kB src/index.js
npm notice 3.5kB src/mundo.js
npm notice 3.3kB src/texto.js
npm notice total files: 10
```
*Peligro detectado:* El archivo `.env` con las claves privadas de producción y los datos locales de mundos quedan expuestos para su subida al registro público de npm.

---

## 5. Verificación de Git (`git ls-files`)

Se ejecutó `git ls-files` para confirmar que `.env` jamás fue rastreado en el repositorio:
```text
.env.example
.gitignore
package-lock.json
package.json
src/imagen.js
src/index.js
src/mundo.js
src/texto.js
```
El archivo `.env` está 100% ausente del historial y del índice de Git.

