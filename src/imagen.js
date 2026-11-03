// Módulo para consultar el modelo de generación de imágenes y devolver sus bytes
const fs = require('fs');
const path = require('path');

/**
 * Consulta la API del modelo de imágenes con la descripción y devuelve el Buffer con los bytes.
 * @param {string} descripcion - Descripción generada en la Parte 3.
 * @returns {Promise<Buffer>} Bytes binarios de la imagen en formato JPEG.
 */
async function generarImagen(descripcion) {
  const url = process.env.IMAGEN_URL;
  const apiKey = process.env.IMAGEN_API_KEY;

  if (!url) {
    throw new Error('La variable IMAGEN_URL no está definida en el archivo .env.');
  }

  let bytes;

  // Detección del tipo de servicio según la URL configurada
  if (url.includes('pollinations.ai')) {
    // Opción C: Pollinations (GET directo, devuelve bytes crudos)
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
        throw new Error('Superaste el límite gratuito. Espera un momento (revisa el encabezado retry-after si existe).');
      }
      if (respuesta.status === 404 || respuesta.status === 410) {
        throw new Error('El modelo o la URL no existen. Revisa tu configuración.');
      }
      throw new Error(`Error en el servicio de imágenes con estado HTTP ${respuesta.status}.`);
    }

    const arrayBuffer = await respuesta.arrayBuffer();
    bytes = Buffer.from(arrayBuffer);

  } else if (url.includes('cloudflare.com')) {
    // Opción B: Cloudflare Workers AI (POST, devuelve JSON con base64 en result.image)
    const headers = {
      'Content-Type': 'application/json'
    };
    if (apiKey && apiKey !== 'ninguna') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const cuerpo = {
      prompt: descripcion,
      steps: 4
    };

    const respuesta = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(60000)
    });

    if (!respuesta.ok) {
      if (respuesta.status === 401 || respuesta.status === 403) {
        throw new Error('La API key no es válida. Revisa tu archivo .env.');
      }
      if (respuesta.status === 402 || respuesta.status === 429) {
        throw new Error('Superaste el límite gratuito. Espera un momento (revisa el encabezado retry-after si existe).');
      }
      if (respuesta.status === 404 || respuesta.status === 410) {
        throw new Error('El modelo o la URL no existen. Revisa tu configuración.');
      }
      throw new Error(`Error en el servicio de imágenes con estado HTTP ${respuesta.status}.`);
    }

    const datos = await respuesta.json();
    const textoBase64 = datos.result?.image;
    if (!textoBase64) {
      throw new Error('Cloudflare no devolvió la imagen en el campo esperado (result.image).');
    }
    bytes = Buffer.from(textoBase64, 'base64');

  } else {
    // Opción A: NVIDIA FLUX.1-schnell (POST, devuelve JSON con artifacts[0].base64)
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
    if (apiKey && apiKey !== 'ninguna') {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const cuerpo = {
      prompt: descripcion,
      width: 1024,
      height: 1024,
      steps: 4,
      seed: 0
    };

    const respuesta = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(cuerpo),
      signal: AbortSignal.timeout(60000)
    });

    if (!respuesta.ok) {
      if (respuesta.status === 401 || respuesta.status === 403) {
        throw new Error('La API key no es válida. Revisa tu archivo .env.');
      }
      if (respuesta.status === 402 || respuesta.status === 429) {
        throw new Error('Superaste el límite gratuito. Espera un momento (revisa el encabezado retry-after si existe).');
      }
      if (respuesta.status === 404 || respuesta.status === 410) {
        throw new Error('El modelo o la URL no existen. Revisa tu configuración.');
      }
      throw new Error(`Error en el servicio de imágenes con estado HTTP ${respuesta.status}.`);
    }

    const datos = await respuesta.json();
    const artifact = datos.artifacts?.[0];
    if (!artifact) {
      throw new Error('NVIDIA no devolvió ningún artefacto de imagen en la respuesta.');
    }

    if (artifact.finishReason !== 'SUCCESS') {
      throw new Error(`La generación de imagen no fue exitosa (finishReason: ${artifact.finishReason}).`);
    }

    if (!artifact.base64) {
      throw new Error('NVIDIA no devolvió los datos en base64 de la imagen.');
    }

    bytes = Buffer.from(artifact.base64, 'base64');
  }

  // Validación final: los bytes no deben estar vacíos
  if (!bytes || bytes.length === 0) {
    throw new Error('Los bytes de la imagen generada están vacíos.');
  }

  return bytes;
}

module.exports = {
  generarImagen
};

