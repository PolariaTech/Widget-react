/**
 * storage.ts — Persistencia de conversaciones en localStorage (portado de js/storage.js).
 *
 * NOTA: localStorage es una solución temporal pensada solo para este prototipo.
 * Es local al navegador (no sincroniza entre dispositivos), tiene un límite de
 * tamaño (~5-10MB) y cualquiera con acceso al navegador puede leerlo. Antes de
 * pasar a producción, este historial debería guardarse en una base de datos o
 * backend real (asociado al usuario/número de teléfono), no en el cliente.
 */
import type { Conversation, Message, MessageRole, MessageType } from '../types';
import { t } from '../i18n';

export const CONVERSATIONS_STORAGE_KEY = 'mateo_chat_conversations';

/**
 * Versión del esquema de lo persistido en `CONVERSATIONS_STORAGE_KEY`. Subir
 * este número junto con un cambio a `Message`/`Conversation` (types.ts) que
 * no sea compatible con datos ya guardados, para poder distinguir "esto es
 * de una versión más nueva del widget, no lo toques" de "esto está corrupto".
 */
const CURRENT_SCHEMA_VERSION = 1;

interface StoredData {
  schemaVersion: number;
  conversations: Conversation[];
}

function isMessage(value: unknown): value is Message {
  if (typeof value !== 'object' || value === null) return false;
  const m = value as Record<string, unknown>;
  return (
    (m.role === 'user' || m.role === 'ai') &&
    (m.type === 'text' || m.type === 'image') &&
    typeof m.content === 'string' &&
    typeof m.timestamp === 'number' &&
    (m.isError === undefined || typeof m.isError === 'boolean')
  );
}

function isConversation(value: unknown): value is Conversation {
  if (typeof value !== 'object' || value === null) return false;
  const c = value as Record<string, unknown>;
  return (
    typeof c.id === 'string' &&
    (c.title === null || typeof c.title === 'string') &&
    typeof c.createdAt === 'number' &&
    typeof c.updatedAt === 'number' &&
    Array.isArray(c.messages) &&
    c.messages.every(isMessage)
  );
}

function isStoredData(value: unknown): value is StoredData {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.schemaVersion === 'number' && Array.isArray(v.conversations);
}

/** Carga el historial de conversaciones guardado en localStorage. */
export function loadConversations(): Conversation[] {
  try {
    const raw = localStorage.getItem(CONVERSATIONS_STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);

    // Compatibilidad con lo guardado antes de la versión de esquema (Fase 0-2
    // de auditoria-widget-react.md): el array de conversaciones sin envelope.
    const rawList = Array.isArray(parsed) ? parsed : isStoredData(parsed) ? parsed.conversations : null;

    if (isStoredData(parsed) && parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      // Versión de esquema más nueva de la que este código sabe leer (ej. el
      // usuario volvió a una build vieja del widget) — descartar en vez de
      // arriesgarse a interpretar mal una forma de datos que no conoce.
      console.warn(`Se descartó el historial: versión de esquema ${parsed.schemaVersion} no soportada (actual: ${CURRENT_SCHEMA_VERSION}).`);
      return [];
    }

    if (rawList === null) return [];
    const valid = rawList.filter(isConversation);
    if (valid.length !== rawList.length) {
      console.warn(`Se descartaron ${rawList.length - valid.length} conversación(es) corrupta(s) del historial.`);
    }
    return valid;
  } catch {
    return [];
  }
}

/** Persiste el arreglo de conversaciones completo en localStorage. Devuelve `false` si falla (típicamente por cuota excedida), para que el caller pueda decidir si avisa al usuario. */
export function saveConversations(conversations: Conversation[]): boolean {
  try {
    const data: StoredData = { schemaVersion: CURRENT_SCHEMA_VERSION, conversations };
    localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (err) {
    console.warn('No se pudo guardar el historial de conversaciones:', err);
    return false;
  }
}

/** Crea una nueva conversación vacía. */
export function createConversation(): Conversation {
  return {
    id: 'conv_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8),
    title: null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    messages: [],
  };
}

/**
 * Agrega un mensaje a la conversación indicada, devolviendo un nuevo arreglo
 * de conversaciones (inmutable). Define el título de la conversación (a partir
 * del primer mensaje) si aún no tiene uno. Si `convId` no existe en `conversations`,
 * la devuelve sin cambios.
 *
 * @param titleOverride Título a usar si esta conversación todavía no tiene uno,
 *   en vez del default por `type` — para cuando el primer mensaje es una imagen
 *   CON caption (ver useChat.ts): sin esto, el título quedaría en "Imagen" aunque
 *   haya un caption de texto más descriptivo disponible en el mismo envío.
 */
export function addMessage(
  conversations: Conversation[],
  convId: string,
  role: MessageRole,
  type: MessageType,
  content: string,
  timestamp: number = Date.now(),
  titleOverride?: string,
  isError?: boolean,
): Conversation[] {
  const index = conversations.findIndex((c) => c.id === convId);
  if (index === -1) return conversations;

  const conv = conversations[index];
  if (!conv) return conversations;

  const defaultTitle = type === 'text' ? content.slice(0, 40) : t('storageImageTitle');
  const updated: Conversation = {
    ...conv,
    updatedAt: Date.now(),
    title: conv.title ?? (titleOverride?.slice(0, 40) || defaultTitle),
    messages: [...conv.messages, { role, type, content, timestamp, isError }],
  };

  const next = [...conversations];
  next[index] = updated;
  return next;
}

/**
 * Reemplaza el contenido del mensaje más reciente que coincida con
 * `convId`/`type`/`timestamp`, devolviendo un nuevo arreglo de conversaciones.
 *
 * Se usa para el mensaje de imagen del usuario: se persiste primero con la
 * Data URL local (para que se vea de inmediato mientras se sube a Cloudinary)
 * y se reemplaza por la `secure_url` una vez la subida termina, para no dejar
 * imágenes en base64 permanentemente en localStorage.
 */
export function replaceMessageContent(
  conversations: Conversation[],
  convId: string,
  type: MessageType,
  timestamp: number,
  newContent: string,
  newType: MessageType = type,
): Conversation[] {
  const index = conversations.findIndex((c) => c.id === convId);
  if (index === -1) return conversations;

  const conv = conversations[index];
  if (!conv) return conversations;

  const msgIndex = conv.messages.findIndex((m) => m.type === type && m.timestamp === timestamp);
  if (msgIndex === -1) return conversations;

  const nextMessages = [...conv.messages];
  const existing = nextMessages[msgIndex];
  if (!existing) return conversations;
  nextMessages[msgIndex] = { ...existing, type: newType, content: newContent };

  const next = [...conversations];
  next[index] = { ...conv, messages: nextMessages };
  return next;
}

/** Elimina una conversación del historial, devolviendo un nuevo arreglo (inmutable). */
export function deleteConversation(conversations: Conversation[], convId: string): Conversation[] {
  return conversations.filter((c) => c.id !== convId);
}
