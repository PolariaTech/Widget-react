/**
 * fileSignature.ts — Detecta el formato real de una imagen por sus primeros
 * bytes ("magic bytes"), en vez de confiar en `file.type` (que el navegador
 * suele derivar de la extensión del archivo — un `documento.pdf` renombrado
 * a `foto.jpg` puede reportar `image/jpeg` sin serlo).
 *
 * Sigue siendo una validación de UX en el cliente, no un control de
 * seguridad real: un adversario puede saltarse esta capa por completo
 * (DevTools, curl) igual que con `IMAGE_VALIDATION` — la aplicación real de
 * formato/tamaño tiene que vivir en la consola de Cloudinary, sobre el
 * upload preset (ver la nota en config.ts).
 */
import type { IMAGE_VALIDATION } from '../config';

type AllowedImageType = (typeof IMAGE_VALIDATION.ALLOWED_TYPES)[number];

/** Lee los primeros bytes necesarios para identificar el formato (12 alcanza para JPEG/PNG/WebP). */
export async function readFileSignature(file: File): Promise<Uint8Array> {
  const buffer = await file.slice(0, 12).arrayBuffer();
  return new Uint8Array(buffer);
}

/**
 * Identifica el formato real de imagen a partir de sus magic bytes.
 * Devuelve `null` si no coincide con ninguno de los formatos permitidos
 * (JPEG/PNG/WebP), sin importar lo que diga `file.type` o la extensión.
 */
export function sniffImageMimeType(bytes: Uint8Array): AllowedImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return 'image/jpeg';
  }

  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a
  ) {
    return 'image/png';
  }

  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
}
