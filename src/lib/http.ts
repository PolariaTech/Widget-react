/**
 * http.ts — Utilidad HTTP genérica compartida (antes vivía en cloudinary.ts,
 * pero `webhook.ts` también la usa para el webhook de n8n — no es específica
 * de Cloudinary).
 */
import { FETCH_TIMEOUT_MS } from '../config';
import { t } from '../i18n';

/**
 * Ejecuta `fetch` con un límite de tiempo usando `AbortController`. Si la
 * solicitud no concluye dentro de `timeoutMs`, se cancela y se rechaza con un
 * error legible. Sin esto, un `fetch` colgado dejaría `isSending` en `true`
 * para siempre y el botón de enviar quedaría deshabilitado permanentemente.
 */
export async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs: number = FETCH_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error(t('requestTimeout'));
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
