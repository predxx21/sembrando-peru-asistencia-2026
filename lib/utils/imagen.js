// utilidades de compresión de imágenes (evidencias de registro de horas).
//
// Dos capas:
//   - Funciones PURAS (testeables con Vitest en Node): decidir si un archivo
//     se puede comprimir (esImagen), cuánto reescalarlo (dimensionesEscaladas)
//     y si supera el tope de bytes (superaBytes). No tocan APIs de navegador.
//   - comprimirImagen(): usa la librería "browser-image-compression" (solo navegador)
//     que maneja EXIF/rotación automáticamente, re-escala y re-codifica respetando
//     la transparencia (PNG/WebP con canal alfa). PDFs se RECHAZAN con error.
//
// Instalación: npm install browser-image-compression
// El objetivo es doble: reducir el espacio en storage (el sistema lo usará
// mucha gente) y que el visor de evidencia descargue archivos mucho menores
// (antes el detalle bajaba el original de varios MB, lo que hacía el viewer
// y la "revisión" notablemente más lentos).

// Tipos MIME que consideramos imágenes comprimibles (PDF excluido a propósito).
const MIMES_COMPRESIBLES = ['image/jpeg', 'image/png', 'image/webp'];

// Límite por defecto: máximo 1600px en el lado mayor, calidad 0.8 JPEG/PNG,
// y re-codificar si supera 200 KB aunque no haya que escalar.
export const OPCIONES_DEFECTO = {
  maxDimension: 1600,
  calidad: 0.8,
  maxBytesSinComprimir: 200 * 1024,
};

// ¿Es una imagen que podemos re-codificar? (PDF se RECHAZA con error).
export function esImagen(file) {
  return Boolean(file && MIMES_COMPRESIBLES.includes(file.type));
}

// ¿Supera el tope de bytes? (tamaño en bruto del archivo original.)
export function superaBytes(bytes, maxBytes) {
  return bytes > maxBytes;
}

// Dimensiones objetivo tras escalar para que el lado mayor no pase de
// `maxDimension`. Devuelve { ancho, alto } o `null` si no hace falta escalar
// (ya cabe, o argumentos inválidos).
export function dimensionesEscaladas(ancho, alto, maxDimension) {
  if (!ancho || !alto || ancho <= 0 || alto <= 0) return null;
  const mayor = Math.max(ancho, alto);
  if (mayor <= maxDimension) return null;
  const escala = maxDimension / mayor;
  return {
    ancho: Math.max(1, Math.round(ancho * escala)),
    alto: Math.max(1, Math.round(alto * escala)),
  };
}

// Carga la imagen como ImageBitmap desde un File (fallback a <img> en
// navegadores sin createImageBitmap, p.ej. Safari < 15).
export function cargarImagen(file) {
  if (typeof createImageBitmap === 'function') {
    return createImageBitmap(file);
  }

  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new window.Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo leer la imagen.'));
    };
    img.src = url;
  });
}

// Detecta si la imagen tiene canal alfa real (transparencia).
// JPEG nunca tiene alfa → ahorro CPU.
// Para PNG/WebP: dibuja en canvas pequeño y escanea canal alfa.
async function tieneCanalAlfa(file) {
  // JPEG nunca tiene canal alfa
  if (file.type === 'image/jpeg') return false;

  try {
    const bitmap = await cargarImagen(file);
    const size = Math.min(bitmap.width, bitmap.height, 64);
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0, size, size);
    const { data } = ctx.getImageData(0, 0, size, size);
    for (let i = 3; i < data.length; i += 4) {
      if (data[i] < 255) {
        if (bitmap.close) bitmap.close();
        return true;
      }
    }
    if (bitmap.close) bitmap.close();
    return false;
  } catch {
    return false;
  }
}

// Comprime/reescala la imagen y devuelve un nuevo File .jpg o .png
// (o el original si no necesita compresión). NAVEGADOR ONLY.
// Lanza error si el archivo no es imagen soportada (PDF, etc.).
export async function comprimirImagen(file, opciones = {}) {
  const { maxDimension, calidad, maxBytesSinComprimir } = { ...OPCIONES_DEFECTO, ...opciones };

  // 1. Rechazar PDF y no-imágenes
  if (!esImagen(file)) {
    throw new Error('Formato no soportado. Solo se permiten imágenes JPEG, PNG o WebP.');
  }

  // 2. Medir dimensiones para saber si hay que escalar
  const bitmap = await cargarImagen(file);
  const objetivo = dimensionesEscaladas(bitmap.width, bitmap.height, maxDimension);
  if (bitmap.close) bitmap.close();

  // 3. Decidir si comprimir: supera umbral de bytes O necesita escalar
  const necesita = superaBytes(file.size, maxBytesSinComprimir) || objetivo !== null;
  if (!necesita) return file;  // ya ligero y cabe → sin procesar

  try {
    // 4. Determinar formato de salida
    const tieneAlfa = await tieneCanalAlfa(file);
    const fileType = (file.type === 'image/png' || file.type === 'image/webp') && tieneAlfa
      ? 'image/png'
      : 'image/jpeg';

    // 5. Import dinámico + compresión con browser-image-compression
    const imageCompression = (await import('browser-image-compression')).default;
    const opcionesBic = {
      maxWidthOrHeight: maxDimension,
      quality: calidad,           // parámetro correcto: quality (no initialQuality)
      fileType,
      useWebWorker: true,
    };
    const compressedBlob = await imageCompression(file, opcionesBic);

    // 6. Renombrar extensión según fileType elegido
    const nombreBase = (file.name || 'evidencia').replace(/\.[^.]+$/, '');
    const extension = fileType === 'image/png' ? '.png' : '.jpg';
    return new File([compressedBlob], `${nombreBase}${extension}`, { type: fileType });
  } catch (err) {
    console.error('[comprimirImagen] Falló la compresión, se usa el original:', err);
    return file;  // fallback seguro
  }
}