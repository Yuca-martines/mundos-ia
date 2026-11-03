// Módulo para validar argumentos, crear el objeto del mundo y guardarlo o leerlo
const fs = require('fs');
const path = require('path');
const objectHash = require('object-hash');

/**
 * Valida los argumentos recibidos por línea de comandos y crea el objeto mundo.
 * @param {string[]} args - Argumentos recibidos (process.argv.slice(2)).
 * @returns {object|null} Objeto del mundo o null si hay error de validación.
 */
function crearMundo(args) {
  // Validación 1: Deben llegar exactamente 7 argumentos
  if (!args || args.length !== 7) {
    console.error('Error: Debes ingresar exactamente 7 argumentos: situación, mundo y 5 colores.');
    console.error('Ejemplo de uso:');
    console.error('npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta');
    process.exitCode = 1;
    return null;
  }

  // Validación 2: Ningún argumento puede estar vacío ni tener solo espacios
  for (let i = 0; i < args.length; i++) {
    if (typeof args[i] !== 'string' || args[i].trim().length === 0) {
      console.error('Error: Ningún argumento puede estar vacío ni contener solo espacios.');
      console.error('Ejemplo de uso:');
      console.error('npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta');
      process.exitCode = 1;
      return null;
    }
  }

  const situacion = args[0].trim();
  const mundo = args[1].trim();
  const colores = args.slice(2).map(c => c.trim());

  // Validación 3: Los 5 colores deben ser distintos (sin distinguir mayúsculas de minúsculas)
  const coloresMin = colores.map(c => c.toLowerCase());
  const coloresUnicos = new Set(coloresMin);
  if (coloresUnicos.size !== 5) {
    console.error('Error: Los 5 colores deben ser distintos entre sí.');
    console.error('Ejemplo de uso:');
    console.error('npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta');
    process.exitCode = 1;
    return null;
  }

  // Generar ID único usando los primeros 8 caracteres del hash
  // IMPORTANTE: No incluimos creadoEn en el hash para que el id sea determinista y reproducible
  const hash = objectHash({ situacion, mundo, colores });
  const id = hash.slice(0, 8);

  const objetoMundo = {
    id,
    situacion,
    mundo,
    colores,
    creadoEn: new Date().toISOString()
  };

  return objetoMundo;
}

/**
 * Guarda el objeto mundo en formato JSON en data/mundo_<id>.json.
 * @param {object} mundo - Objeto del mundo generado.
 * @returns {string} Ruta absoluta del archivo guardado.
 */
function guardarMundo(mundo) {
  const dirData = path.join(__dirname, '..', 'data');
  if (!fs.existsSync(dirData)) {
    fs.mkdirSync(dirData, { recursive: true });
  }

  const rutaArchivo = path.join(dirData, `mundo_${mundo.id}.json`);
  fs.writeFileSync(rutaArchivo, JSON.stringify(mundo, null, 2), 'utf-8');
  return rutaArchivo;
}

/**
 * Lee y parsea un archivo JSON de mundo desde el disco.
 * @param {string} ruta - Ruta al archivo JSON.
 * @returns {object} Objeto del mundo parseado.
 */
function leerMundo(ruta) {
  const contenido = fs.readFileSync(ruta, 'utf-8');
  return JSON.parse(contenido);
}

module.exports = {
  crearMundo,
  guardarMundo,
  leerMundo
};

