# mundos-ia

Este es un proyecto de consola en Node.js para el taller de videojuegos. La idea es que recibe una situación, un mundo y 5 colores por la terminal, y con eso genera la descripción de una imagen usando un modelo de lenguaje (IA de texto) y luego crea la imagen con una IA de generación de imágenes (FLUX).

## ¿Cómo funciona?

1. Guarda los datos en un archivo JSON dentro de la carpeta data/ con un id único generado con object-hash.
2. Lee ese archivo JSON y le pide a la API de texto una descripción visual en inglés (entre 80 y 120 palabras) usando los 5 colores. La descripción se guarda en la carpeta descripciones/.
3. Toma ese texto y se lo manda a la API de imágenes para generar la foto en formato JPG y guardarla en la carpeta imagenes/.
4. Si vuelves a correr el mismo comando, el programa revisa si los archivos ya existen y no vuelve a llamar a las APIs para ahorrar la cuota gratuita.

## Requisitos

- Node.js versión 20.12 o superior (probado en v24)
- npm y Git

## Instalación y configuración

1. Clonas el repositorio o descargas la carpeta.
2. Instalas las dependencias (solo usa object-hash):
   npm install
3. Creas tu archivo .env copiando el ejemplo:
   cp .env.example .env
4. En el archivo .env pones las URLs y tus claves de API si vas a usar Groq, NVIDIA o Cloudflare. Si vas a usar Pollinations no necesitas clave (puedes dejar ninguna).

## Ejemplo de uso

Para correr el programa debes pasar entre comillas la situación y el mundo, y luego los 5 colores separados por espacio:

npm start -- "Una tormenta eléctrica amenaza la ciudad flotante" "Aerópolis, un archipiélago de islas que flotan sobre las nubes" rojo azul verde dorado violeta

Salida esperada la primera vez:
Paso 1: mundo guardado en data/mundo_cba86145.json
Paso 2: descripción guardada en descripciones/mundo_cba86145.txt
Paso 3: imagen guardada en imagenes/mundo_cba86145.jpg
Listo. Revisa la carpeta imagenes/

Si lo ejecutas de nuevo con los mismos datos:
Paso 1: mundo guardado en data/mundo_cba86145.json
Paso 2: la descripción ya existía, no se llamó al modelo de texto.
Paso 3: la imagen ya existía, no se llamó al modelo de imágenes.
Listo. Revisa la carpeta imagenes/

## Estructura de carpetas

- src/index.js: Archivo principal que une todos los pasos y controla los errores.
- src/mundo.js: Valida los argumentos, saca el id con hash y guarda/lee el JSON.
- src/texto.js: Hace la petición a la API de texto y devuelve la descripción.
- src/imagen.js: Pide la imagen a la API y guarda los bytes en jpg.
- data/: Donde se guardan los mundos en JSON.
- descripciones/: Donde quedan los archivos de texto generados.
- imagenes/: Donde quedan las fotos generadas.
- evidencias/: Carpeta con los respaldos y capturas de las pruebas del taller.

## Experimento con npm publish --dry-run

Hicimos la prueba de empaquetar con npm publish --dry-run.
- Con el .gitignore puesto: npm no mete las carpetas data/, descripciones/, imagenes/ ni el archivo .env. Todo queda protegido.
- Cuando cambiamos el nombre a .gitignore.off: npm intentó empaquetar el .env y los JSON. Esto es muy peligroso porque si publicas el paquete a npm con las claves reales, cualquiera las puede ver y robarte la cuenta o gastarte los créditos.

## Respuestas a las preguntas de reflexión

1. ¿Por qué el id se calcula sin la fecha? ¿Qué pasaría si la incluyeras?
Porque si le metemos la fecha, cada vez que corras el comando el id va a ser diferente aunque la situación y los colores sean los mismos, ya que la hora cambia en cada segundo. Sin la fecha, los mismos datos siempre dan el mismo id y así el programa sabe que ese mundo ya se hizo y no gasta la API otra vez.

2. ¿Por qué se le pide al modelo de texto la descripción en inglés?
Porque las IAs que hacen imágenes (como FLUX o Stable Diffusion) fueron entrenadas casi todo en inglés. Si le pides cosas en español a veces no entiende bien los estilos artísticos o confunde los colores. En inglés las imágenes salen mucho más parecidas a lo que uno pidió.

3. ¿Qué diferencia hay entre una respuesta JSON de texto y una respuesta con los bytes de una imagen? ¿Qué es base64?
El JSON es texto normal (letras y números) que uno puede leer directamente. La imagen son bytes binarios que representan los píxeles del archivo. Base64 es una forma de convertir esos bytes binarios en letras y números para poder mandarlos dentro de un JSON sin que se dañen.

4. ¿Qué pasaría si guardas la imagen con 'utf-8'? ¿Por qué?
Si le pones 'utf-8' al guardar la imagen, Node va a intentar leer los bytes como si fueran letras de texto. Como muchos bytes no son letras válidas, los cambia por signos raros y daña el archivo, por lo que la imagen queda corrupta y no se puede abrir. La imagen se tiene que guardar directamente como Buffer sin codificación de texto.

5. ¿Qué pasos consumen cuota gratuita y cómo evitaste repetirlos?
El paso 2 (pedir el texto a la IA) y el paso 3 (pedir la imagen). Lo evité usando fs.existsSync: antes de llamar a la API, el programa mira si ya existe el .txt o el .jpg. Si ya están en la carpeta, simplemente los usa y se salta la llamada a internet.

6. Si usaste IA: ¿qué fue lo más difícil de pedirle y qué parte tuviste que corregir tú?
Lo más difícil fue que no usara librerías como axios o dotenv, porque la IA siempre quiere instalarlas de una. Me tocó corregir eso para usar solo el fetch nativo de Node y process.loadEnvFile(). También tocó ajustar el prompt para que el modelo de texto no se quedara pensando tanto tiempo y no diera error de timeout.
