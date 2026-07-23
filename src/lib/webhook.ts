/**
 * webhook.ts — Construcción y envío del payload al backend de n8n (POL-72).
 *
 * Body: `{ message_text, message_type }` + identidad del hablante (`id_rol`,
 * `rol`, `id_usuario`, …) leída del JWT. La autenticación sigue yendo en
 * `Authorization: Bearer <jwt>` (validado en n8n, POL-71).
 *
 * Cuando el usuario adjunta imagen CON texto, `useChat.ts` hace dos POSTs
 * secuenciales (imagen, luego texto).
 */
import { N8N_WEBHOOK_URL } from '../config';
import { fetchWithTimeout } from './http';
import { t } from '../i18n';
import { forceRefresh, getValidToken } from './authToken';
import { speakerClaimsFromToken } from './jwtPayload';

export interface OutgoingMessage {
  message_text: string;
  message_type: 'text' | 'image';
  /** Rol WMS del usuario logueado (mismo valor que claim JWT `idRol` / `rol`). */
  id_rol?: string;
  rol?: string;
  id_usuario?: string;
  email?: string;
  given_name?: string;
  family_name?: string;
  codigo_empresa?: string | null;
  codigo_cuenta?: string | null;
}

export function buildTextMessage(text: string): OutgoingMessage {
  return { message_text: text, message_type: 'text' };
}

export function buildImageMessage(imageUrl: string): OutgoingMessage {
  return { message_text: imageUrl, message_type: 'image' };
}

/** Adjunta claims del JWT al body para que n8n/Mateo sepan quién habla. */
export function withSpeakerClaims(message: OutgoingMessage, token: string): OutgoingMessage {
  const speaker = speakerClaimsFromToken(token);
  if (!speaker) return message;
  return { ...message, ...speaker };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Convierte estructuras tipo tabla (objetos/arrays de n8n o del LLM) a markdown
 * de pipes para que `parseRichContent` las pinte con diseño Polaria.
 */
function tableLikeToMarkdown(value: unknown): string | null {
  if (Array.isArray(value) && value.length > 0 && isPlainObject(value[0])) {
    const headers = Object.keys(value[0]!);
    if (headers.length < 2) return null;
    const lines = [
      headers.join(' | '),
      ...value.map((row) => {
        const obj = isPlainObject(row) ? row : {};
        return headers.map((h) => String(obj[h] ?? '')).join(' | ');
      }),
    ];
    return lines.join('\n');
  }

  if (!isPlainObject(value)) return null;

  const headers = value.headers;
  const rows = value.rows;
  if (Array.isArray(headers) && Array.isArray(rows) && headers.length >= 2) {
    const headerLine = headers.map((h) => String(h ?? '')).join(' | ');
    const dataLines = rows.map((row) => {
      if (Array.isArray(row)) {
        return headers.map((_, i) => String(row[i] ?? '')).join(' | ');
      }
      if (isPlainObject(row)) {
        return headers.map((h) => String(row[String(h)] ?? '')).join(' | ');
      }
      return String(row ?? '');
    });
    return [headerLine, ...dataLines].join('\n');
  }

  // { columns: [...], data: [...] } u otras formas frecuentes
  const columns = value.columns ?? value.cols;
  const data = value.data ?? value.items ?? value.records;
  if (Array.isArray(columns) && Array.isArray(data) && columns.length >= 2) {
    return tableLikeToMarkdown({ headers: columns, rows: data });
  }

  return null;
}

/**
 * Normaliza las formas habituales de n8n / agentes AI a un string de chat.
 * - `{ output: "..." }` / `reply` / `text` / `message` / …
 * - `[{ output: "..." }]` (Respond to Webhook con items)
 * - `output` como objeto tabla → markdown de pipes
 */
function coerceReplyCandidate(value: unknown, depth = 0): string | null {
  if (depth > 6) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (value == null) return null;

  if (Array.isArray(value)) {
    if (value.length === 0) return null;
    const asTable = tableLikeToMarkdown(value);
    if (asTable) return asTable;

    const parts = value
      .map((item) => coerceReplyCandidate(item, depth + 1))
      .filter((part): part is string => typeof part === 'string' && part.trim().length > 0);
    if (parts.length === 1) return parts[0]!;
    if (parts.length > 1) return parts.join('\n\n');
    return null;
  }

  if (isPlainObject(value)) {
    const preferredKeys = [
      'output',
      'reply',
      'text',
      'message',
      'content',
      'response',
      'answer',
    ] as const;
    for (const key of preferredKeys) {
      if (key in value) {
        const inner = coerceReplyCandidate(value[key], depth + 1);
        if (inner) return inner;
      }
    }

    const asTable = tableLikeToMarkdown(value);
    if (asTable) return asTable;
  }

  return null;
}

export interface N8nReply {
  text: string;
  /** `true` si `text` es un mensaje de error nuestro (falla de red/auth/formato inesperado), no una respuesta real de Mateo — para que la burbuja se distinga visualmente (ver MessageBubble.tsx). */
  isError: boolean;
}

/**
 * n8n normalmente responde `{ output }`/`{ reply }`/`{ text }` con un string.
 * También aceptamos arrays de items y objetos tabla; si no hay nada usable,
 * no se le muestra el JSON crudo al usuario.
 */
function extractReplyText(parsed: unknown): N8nReply {
  const text = coerceReplyCandidate(parsed);
  if (text && text.trim().length > 0) {
    return { text, isError: false };
  }

  const shape =
    parsed === null
      ? 'null'
      : Array.isArray(parsed)
        ? `array(len=${parsed.length})`
        : typeof parsed === 'object'
          ? `object(keys=${Object.keys(parsed as object).join(',')})`
          : typeof parsed;
  console.warn(`[Mateo webhook] formato de respuesta no usable: ${shape}`);
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
    let payload = withSpeakerClaims(message, token);
    let res = await postMessage(payload, token);

    // n8n a veces responde 403 (JWT inválido / sin permiso) en vez de 401.
    if (res.status === 401 || res.status === 403) {
      try {
        token = await forceRefresh();
      } catch {
        return { text: t('webhookAuthError'), isError: true };
      }
      payload = withSpeakerClaims(message, token);
      res = await postMessage(payload, token);
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
