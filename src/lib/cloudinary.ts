/**
 * cloudinary.ts — validación y subida de imágenes a Cloudinary (portado 1:1 de js/chat.js).
 */
import { CLOUDINARY_CLOUD_NAME, CLOUDINARY_UPLOAD_PRESET, IMAGE_VALIDATION, isAllowedImageType } from '../config';
import { fetchWithTimeout } from './http';
import { t } from '../i18n';

export interface ImageValidationResult {
  valid: boolean;
  error: string | null;
}

/**
 * Valida que una imagen cumpla con las restricciones de formato y tamaño
 * antes de intentar subirla a Cloudinary.
 *
 * @param dataUrl Imagen en formato data URL (base64).
 * @param mimeType MIME type del archivo (ej. 'image/jpeg').
 */
export function validateImage(dataUrl: string, mimeType: string): ImageValidationResult {
  if (!isAllowedImageType(mimeType)) {
    return {
      valid: false,
      error: t('cloudinaryTypeNotAllowed', { allowedTypes: IMAGE_VALIDATION.ALLOWED_TYPES_DISPLAY, mimeType }),
    };
  }

  const sizeInBytes = Math.ceil((dataUrl.length * 3) / 4);
  if (sizeInBytes > IMAGE_VALIDATION.MAX_FILE_SIZE) {
    const sizeInMB = (sizeInBytes / 1024 / 1024).toFixed(2);
    const maxSizeInMB = (IMAGE_VALIDATION.MAX_FILE_SIZE / 1024 / 1024).toFixed(1);
    return {
      valid: false,
      error: t('cloudinaryTooLarge', { sizeMB: sizeInMB, maxMB: maxSizeInMB }),
    };
  }

  return { valid: true, error: null };
}

interface CloudinaryUploadResponse {
  secure_url?: string;
}

function isCloudinaryUploadResponse(value: unknown): value is CloudinaryUploadResponse {
  return typeof value === 'object' && value !== null;
}

/** `secure_url` es una URL pública que se asigna directamente a `<img src>` (ver MessageBubble.tsx) — validar que sea una URL bien formada antes de confiar en ella, no solo que exista. */
function isWellFormedUrl(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sube una imagen a Cloudinary sin firma (unsigned upload) y devuelve su URL pública.
 *
 * @throws Si la validación local falla, Cloudinary rechaza la subida, la
 *   solicitud expira, o falta secure_url en la respuesta (o no es una URL válida).
 */
export async function uploadToCloudinary(dataUrl: string, mimeType: string): Promise<string> {
  const validation = validateImage(dataUrl, mimeType);
  if (!validation.valid) {
    throw new Error(validation.error ?? t('cloudinaryInvalidImage'));
  }

  const formData = new FormData();
  formData.append('file', dataUrl);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const res = await fetchWithTimeout(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(t('cloudinaryUploadError', { status: res.status, body: errBody.substring(0, 200) }));
    }

    const data: unknown = await res.json();
    if (!isCloudinaryUploadResponse(data) || !data.secure_url || !isWellFormedUrl(data.secure_url)) {
      throw new Error(t('cloudinaryNoSecureUrl'));
    }

    return data.secure_url;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(t('cloudinaryUploadFailed', { message }));
  }
}
