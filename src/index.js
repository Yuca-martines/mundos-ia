// Archivo principal que orquesta los pasos 1, 2 y 3 del taller mundos-ia
const fs = require('fs');
const path = require('path');
const { crearMundo, guardarMundo, leerMundo } = require('./mundo');
const { describirMundo } = require('./texto');
const { generarImagen } = require('./imagen');

/**
 * Función principal asíncrona que coordina todo el flujo del programa.
 */
async function main() {
  // Cargar variables de entorno de forma nativa desde .env (Node.js 20.12+)
  try {
    process.loadEnvFile();
  } catch (error) {
    console.error('Error: No se encontró el archivo .env. Copia .env.example a .env y configura tus claves.');
    process.exitCode = 1;
    return;
  }

  try {
    // ==========================================
    // PASO 1: Validar parámetros y guardar JSON
    // ==========================================
    const args = process.argv.slice(2);
    const mundo = crearMundo(args);
    if (!mundo) {
      // Si la validación falló, crearMundo ya mostró el mensaje y asignó exitCode = 1
      return;
    }

    const rutaJson = guardarMundo(mundo);
    console.log(`Paso 1: mundo guardado en data/mundo_${mundo.id}.json`);

    // Consultar el mundo directamente desde el archivo guardado (no usar el de memoria)
    const mundoGuardado = leerMundo(rutaJson);

    // ==========================================
    // PASO 2: Obtener o reutilizar descripción
    // ==========================================
    const dirDescripciones = path.join(__dirname, '..', 'descripciones');
    const rutaTxt = path.join(dirDescripciones, `mundo_${mundoGuardado.id}.txt`);
    let descripcion;

    if (fs.existsSync(rutaTxt)) {
      console.log('Paso 2: la descripción ya existía, no se llamó al modelo de texto.');
      descripcion = fs.readFileSync(rutaTxt, 'utf-8');
    } else {
      descripcion = await describirMundo(mundoGuardado);
      if (!fs.existsSync(dirDescripciones)) {
        fs.mkdirSync(dirDescripciones, { recursive: true });
      }
      fs.writeFileSync(rutaTxt, descripcion, 'utf-8');
      console.log(`Paso 2: descripción guardada en descripciones/mundo_${mundoGuardado.id}.txt`);
    }

    // ==========================================
    // PASO 3: Generar o reutilizar imagen
    // ==========================================
    const dirImagenes = path.join(__dirname, '..', 'imagenes');
    const rutaJpg = path.join(dirImagenes, `mundo_${mundoGuardado.id}.jpg`);

    if (fs.existsSync(rutaJpg)) {
      console.log('Paso 3: la imagen ya existía, no se llamó al modelo de imágenes.');
    } else {
      // La descripción que se envía a la imagen se lee directamente desde el archivo .txt
      const descripcionDesdeTxt = fs.readFileSync(rutaTxt, 'utf-8');
      const bytesImagen = await generarImagen(descripcionDesdeTxt);

      if (!fs.existsSync(dirImagenes)) {
        fs.mkdirSync(dirImagenes, { recursive: true });
      }
      // Se escriben los bytes binarios directamente, sin pasar 'utf-8'
      fs.writeFileSync(rutaJpg, bytesImagen);
      console.log(`Paso 3: imagen guardada en imagenes/mundo_${mundoGuardado.id}.jpg`);
    }

    console.log('Listo. Revisa la carpeta imagenes/');

  } catch (error) {
    process.exitCode = 1;

    // Manejo de errores explicados en español según las especificaciones de la Parte 5
    if (error.name === 'TimeoutError') {
      console.error('El servicio tardó demasiado en responder.');
    } else if (error instanceof TypeError) {
      console.error('No se pudo conectar. Revisa tu internet o la URL.');
    } else {
      console.error(error.message);
    }
  }
}

main();

