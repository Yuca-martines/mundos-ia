// Modulo para pedir la descripcion al modelo de texto

// Consulta la API del modelo de lenguaje para obtener la descripción
async function describirMundo(mundo) {
  const url = process.env.TEXTO_URL;
  const apiKey = process.env.TEXTO_API_KEY;
  const modelo = process.env.TEXTO_MODELO || 'openai/gpt-oss-20b';

  if (!url) {
    throw new Error('La variable TEXTO_URL no está definida en el archivo .env.');
  }

  // Mensaje de sistema con las especificaciones del taller
  const systemPrompt = 'You are an expert prompt engineer. Based on the provided world JSON, write a single descriptive paragraph in English (between 80 and 120 words) describing a visual image of this scene. Describe the environment, lighting, composition, and artistic style. You must incorporate all 5 colors provided. Do not write stories, lore or markdown, return only the plain image description paragraph.';

  const cuerpo = {
    model: modelo,
    max_tokens: 500,
    messages: [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: JSON.stringify(mundo)
      }
    ]
  };

  // Si se usa Pollinations, reducir el esfuerzo de razonamiento para evitar timeouts
  if (url.includes('pollinations.ai')) {
    cuerpo.reasoning_effort = 'low';
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  // Solo enviar cabecera Authorization si existe la clave y no es vacía
  if (apiKey && apiKey !== 'ninguna') {
    headers['Authorization'] = `Bearer ${apiKey}`;
  }

  const respuesta = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(cuerpo),
    signal: AbortSignal.timeout(30000)
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
    throw new Error(`Error en el servicio de texto con estado HTTP ${respuesta.status}.`);
  }

  const datos = await respuesta.json();
  let descripcion = datos.choices?.[0]?.message?.content?.trim();

  // Validaciones de la descripción
  if (!descripcion) {
    throw new Error('El modelo de texto devolvió una respuesta vacía.');
  }

  if (descripcion.length > 1500) {
    console.warn('Aviso: La descripción superaba los 1500 caracteres y fue recortada.');
    descripcion = descripcion.slice(0, 1500);
  }

  return descripcion;
}

module.exports = {
  describirMundo
};
