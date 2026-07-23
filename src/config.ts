/**
 * config.ts — Constantes de configuración del widget (portado de js/config.js).
 *
 * Los valores que dependen del ambiente (URL del webhook de n8n, credenciales
 * de Cloudinary) se leen de `import.meta.env.VITE_*` (ver .env.example),
 * definidos por ambiente en `.env.development` / `.env.staging` /
 * `.env.production` — nunca en este archivo. El valor tras `??` es solo el
 * default de desarrollo (mismo valor que antes estaba hardcodeado) para que
 * `npm run dev`/`build` sigan funcionando aunque falte alguno de esos
 * archivos `.env.*` todavía.
 */

/** URL del webhook de n8n que procesa los mensajes del widget. */
export const N8N_WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_URL ?? 'https://polariatech.app.n8n.cloud/webhook/mateo-support';

/** Cloud name de Cloudinary donde se alojan las imágenes subidas. */
export const CLOUDINARY_CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME ?? 'ujssaxx6';

/**
 * Upload preset (unsigned) de Cloudinary; debe coincidir exactamente con el creado en Cloudinary.
 *
 * NOTA (fuera de alcance de este refactor): un preset "unsigned" confía en el
 * cliente. `IMAGE_VALIDATION` de abajo es solo una primera barrera en el
 * navegador y se puede saltar fácilmente (DevTools, curl, etc.). Las
 * restricciones reales de formato y tamaño deben configurarse del lado de
 * Cloudinary, en la consola, sobre el propio upload preset.
 */
export const CLOUDINARY_UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET ?? 'mateo_test_unsigned';

/** Restricciones de seguridad para la subida de imágenes con unsigned preset. */
export const IMAGE_VALIDATION = {
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'] as const,
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5 MB en bytes
  ALLOWED_TYPES_DISPLAY: 'JPG, PNG, WebP',
};

/** Type predicate compartido: evita repetir el mismo cast `as (typeof IMAGE_VALIDATION.ALLOWED_TYPES)[number]` en cada punto donde se valida un mimeType (InputFooter.tsx, lib/cloudinary.ts). */
export function isAllowedImageType(mimeType: string): mimeType is (typeof IMAGE_VALIDATION.ALLOWED_TYPES)[number] {
  return (IMAGE_VALIDATION.ALLOWED_TYPES as readonly string[]).includes(mimeType);
}

/** Tiempo máximo (ms) que se espera antes de cancelar una petición de red (Cloudinary o n8n). */
export const FETCH_TIMEOUT_MS = 120000;

/** Longitud máxima de un mensaje de texto saliente. */
export const MAX_MESSAGE_LENGTH = 2000;

/** Tamaño (ancho/alto) del modal cuando no está en pantalla completa. */
export const DEFAULT_SIZE = { w: '320px', h: '420px' };
