// utilidades de compresión de imágenes (evidencias de registro de horas).
//
// Dos capas:
//   - Funciones PURAS (testeables con Vitest en Node): decidir si un archivo
//     se puede comprimir (esImagen), cuánto reescalarlo (dimensionesEscaladas)
//     y si supera el tope de bytes (superaBytes). No tocan APIs de navegador.
//   - comprimirImagen(): usa canvas (solo navegador) para re-escalar la imagen
//     original a una dimensión máxima y re-codificarla a JPEG de calidad media.
//
// El objetivo es doble: reducir el espacio en storage (el sistema lo usará
// mucha gente) y que el visor de evidencia descargue archivos mucho menores
// (antes el detalle bajaba el original de varios MB, lo que hacía el viewer
// y la "revisión" notablemente más lentos).

// Tipos MIME que consideramos imágenes comprimibles.
const MIMES_COMPRESIBLES = ['image/jpeg', 'image/png', 'image/webp'];

// Límite por defecto: máximo 1600px en el lado mayor y calidad 0.8 JPEG.
export const OPCIONES_DEFECTO = {
  maxDimension: 1600,
  calidad: 0.8,
};

// ¿Es una imagen que podemos re-codificar? (PDF se deja tal cual.)
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

// Prepara el canvas a la resolución objetivo y devuelve el canvas.
function crearCanvas(bitmap, ancho, alto) {
  const canvas = document.createElement('canvas');
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, ancho, alto);
  return canvas;
}

// Comprime/reescala la imagen y devuelve un nuevo File .jpg (o el original
// si no es imagen compresible o ya cabe). NAVEGADOR ONLY (usa canvas).
export async function comprimirImagen(file, opciones = {}) {
  const { maxDimension, calidad } = { ...OPCIONES_DEFECTO, ...opciones };

  if (!esImagen(file)) return file;

  const bitmap = await cargarImagen(file);
  const objetivo = dimensionesEscaladas(bitmap.width, bitmap.height, maxDimension);

  // No hace falta re-codificar: devolvemos el original.
  if (!objetivo) {
    if (bitmap.close) bitmap.close();
    return file;
  }

  const canvas = crearCanvas(bitmap, objetivo.ancho, objetivo.alto);
  if (bitmap.close) bitmap.close();

  const blob = await new Promise((resolve) =>
    canvas.toBlob(resolve, 'image/jpeg', calidad)
  );

  const nombreBase = (file.name || 'evidencia').replace(/\.[^.]+$/, '');
  return new File([blob], `${nombreBase}.jpg`, { type: 'image/jpeg' });
}