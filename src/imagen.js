// Modulo para pedir la imagen a la API de Pollinations y devolver sus bytes

// Pide la imagen a la API y devuelve los bytes binarios del archivo JPG
async function generarImagen(descripcion) {
  const url = process.env.IMAGEN_URL;

  if (!url) {
    throw new Error('La variable IMAGEN_URL no está definida en el archivo .env.');
  }

  // Pollinations recibe la descripcion codificada en la URL mediante una peticion GET
  const baseUrl = url.replace(/\/prompt\/?$/, '').replace(/\/$/, '');
  const endpoint = `${baseUrl}/prompt/${encodeURIComponent(descripcion)}?width=1024&height=1024&nologo=true`;

  const respuesta = await fetch(endpoint, {
    method: 'GET',
    signal: AbortSignal.timeout(60000)
  });

  if (!respuesta.ok) {
    if (respuesta.status === 401 || respuesta.status === 403) {
      throw new Error('La API key no es válida. Revisa tu archivo .env.');
    }
    if (respuesta.status === 402 || respuesta.status === 429) {
      const retryAfter = respuesta.headers.get('retry-after');
      if (retryAfter) {
        throw new Error(`Superaste el límite gratuito. Espera un momento (revisa el encabezado retry-after: ${retryAfter}s).`);
      }
      throw new Error('Superaste el límite gratuito. Espera un momento.');
    }
    if (respuesta.status === 404 || respuesta.status === 410) {
      throw new Error('El modelo o la URL no existen. Revisa tu configuración.');
    }
    throw new Error(`Error en el servicio de imágenes con estado HTTP ${respuesta.status}.`);
  }

  // Leemos la imagen directamente como bytes (ArrayBuffer) y creamos el Buffer
  const arrayBuffer = await respuesta.arrayBuffer();
  const bytes = Buffer.from(arrayBuffer);

  // Validacion: comprobar que los bytes no esten vacios
  if (!bytes || bytes.length === 0) {
    throw new Error('Los bytes de la imagen generada están vacíos.');
  }

  return bytes;
}

module.exports = {
  generarImagen
};
