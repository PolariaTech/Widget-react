/**
 * webhook.ts — Construcción y envío del payload plano al backend de n8n
 * (POL-72, ver `borradores/PLAN_ACCION_WIDGET_POL-70-71-72-73.md` sección 3).
 *
 * Body plano `{ message_text, message_type }` — reemplaza la envoltura de
 * WhatsApp Business (`entry[].changes[].value.messages[]`) que usaba este
 * módulo antes. La identidad del visitante ya no viaja en el body (ni el
 * `USER_PHONE` fijo compartido por todos los visitantes, ni ningún otro
 * campo de sesión): viaja en el JWT del header `Authorization`, validado del
 * lado de n8n (POL-71, en paralelo — ver `lib/authToken.ts`).
 *
 * DECISIÓN DE DISEÑO: el body plano tiene exactamente 2 campos, sin espacio
 * para un caption de imagen aparte (antes `buildImageMessage` aceptaba un
 * `caption` embebido en el mismo mensaje). Cuando el usuario adjunta una
 * imagen CON texto, `useChat.ts` hace dos llamadas secuenciales a
 * `sendToN8n` (imagen, luego texto) en vez de una sola combinada — cada una
 * genera su propia respuesta de Mateo, igual que ya se mostraban como dos
 * burbujas de *entrada* separadas en la UI.
 */
import { N8N_WEBHOOK_URL } from '../config';
import { fetchWithTimeout } from './http';
import { t } from '../i18n';
import { forceRefresh, getValidToken } from './authToken';

export interface OutgoingMessage {
  message_text: string;
  message_type: 'text' | 'image';
}

export function buildTextMessage(text: string): OutgoingMessage {
  return { message_text: text, message_type: 'text' };
}

export function buildImageMessage(imageUrl: string): OutgoingMessage {
  return { message_text: imageUrl, message_type: 'image' };
}

interface N8nJsonReply {
  output?: unknown;
  reply?: unknown;
  text?: unknown;
}

function isN8nJsonReply(value: unknown): value is N8nJsonReply {
  return typeof value === 'object' && value !== null;
}

export interface N8nReply {
  text: string;
  /** `true` si `text` es un mensaje de error nuestro (falla de red/auth/formato inesperado), no una respuesta real de Mateo — para que la burbuja se distinga visualmente (ver MessageBubble.tsx). */
  isError: boolean;
}

/**
 * n8n normalmente responde `{ output }`/`{ reply }`/`{ text }` con un string.
 * Si la forma es otra cosa (array, objeto vacío, primitivo) no se le muestra
 * el JSON crudo al usuario — eso expondría la forma interna de la respuesta
 * de n8n como si fuera una respuesta real de Mateo.
 */
function extractReplyText(parsed: unknown): N8nReply {
  if (isN8nJsonReply(parsed)) {
    const candidate = parsed.output ?? parsed.reply ?? parsed.text;
    if (typeof candidate === 'string') return { text: candidate, isError: false };
  }
  return { text: t('webhookUnexpectedReply'), isError: true };
}

function postMessage(message: OutgoingMessage, bearerToken: string): Promise<Response> {
  return fetchWithTimeout(N8N_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${bearerToken}` },
    body: JSON.stringify(message),
  });
}

/**
 * Envía un mensaje saliente al webhook de n8n y devuelve el texto de la
 * respuesta de Mateo (o un mensaje de error legible si algo falla).
 *
 * Autenticación: adjunta `Authorization: Bearer <jwt>` con el token vigente
 * (`getValidToken`, refresco proactivo ~30s antes de expirar — ver
 * `authToken.ts`). Si n8n responde 401 (token vencido/inválido pese al
 * refresh proactivo), se fuerza un refresh reactivo una única vez y se
 * reintenta la misma solicitud — nunca en loop.
 */
export async function sendToN8n(message: OutgoingMessage): Promise<N8nReply> {
  let token: string;
  try {
    token = await getValidToken();
  } catch {
    return { text: t('webhookAuthError'), isError: true };
  }

  try {
    let res = await postMessage(message, token);

    // n8n a veces responde 403 (JWT inválido / sin permiso) en vez de 401.
    if (res.status === 401 || res.status === 403) {
      try {
        token = await forceRefresh();
      } catch {
        return { text: t('webhookAuthError'), isError: true };
      }
      res = await postMessage(message, token);
      if (res.status === 401 || res.status === 403) {
        return { text: t('webhookAuthError'), isError: true };
      }
    }

    if (!res.ok) {
      console.warn(
        `[Mateo webhook] n8n respondió HTTP ${res.status} en ${N8N_WEBHOOK_URL}`,
      );
      return { text: t('webhookConnectionError'), isError: true };
    }

    const raw = await res.text();
    try {
      const data: unknown = JSON.parse(raw);
      return extractReplyText(data);
    } catch {
      return { text: raw, isError: false };
    }
  } catch (err) {
    console.warn('[Mateo webhook] fallo de red/timeout hacia n8n:', err);
    return { text: t('webhookConnectionError'), isError: true };
  }
}
