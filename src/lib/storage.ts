/**
 * storage.ts — Persistencia de conversaciones.
 *
 * Producción (embed Polaria): `RemoteConversationRepository` vía API WMS
 * (`widget_conversacion` / `widget_mensaje`). localStorage queda como fallback
 * de desarrollo/offline — no es fuente de verdad en prod (docs/SEGURIDAD.md).
 */
import type { Conversation, Message, MessageRole, MessageType } from '../types';
import { t } from '../i18n';
import { getEmbedRuntimeConfig } from './embedConfig';
import { RemoteConversationRepository } from './conversationApi';

export const CONVERSATIONS_STORAGE_KEY = 'mateo_chat_conversations';

/**
 * Versión del esquema de lo persistido en `CONVERSATIONS_STORAGE_KEY`. Subir
 * este número junto con un cambio a `Message`/`Conversation` (types.ts) que
 * no sea compatible con datos ya guardados.
 */
const CURRENT_SCHEMA_VERSION = 1;

interface StoredData {
  schemaVersion: number;
  conversations: Conversation[];
}

/** Contrato de persistencia (local o remoto). */
export interface ConversationRepository {
  list(): Promise<Conversation[]>;
  create(titulo?: string | null): Promise<Conversation>;
  getDetail(id: string): Promise<Conversation>;
  appendMessage(id: string, message: Message): Promise<void>;
  delete(id: string): Promise<void>;
  /** Persistencia completa (solo local / cache). Remoto no-op o mirror. */
  saveAll?(conversations: Conversation[]): Promise<boolean>;
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

    const rawList = Array.isArray(parsed) ? parsed : isStoredData(parsed) ? parsed.conversations : null;

    if (isStoredData(parsed) && parsed.schemaVersion > CURRENT_SCHEMA_VERSION) {
      console.warn(
        `Se descartó el historial: versión de esquema ${parsed.schemaVersion} no soportada (actual: ${CURRENT_SCHEMA_VERSION}).`,
      );
      return [];
    }

    if (rawList === null) return [];
    const valid = rawList.filter(isConversation);
    if (valid.length !== rawList.length) {
      console.warn(
        `Se descartaron ${rawList.length - valid.length} conversación(es) corrupta(s) del historial.`,
      );
    }
    return valid;
  } catch {
    return [];
  }
}

/** Persiste el arreglo de conversaciones completo en localStorage. */
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

/** Fallback dev/offline: localStorage. */
export class LocalStorageRepository implements ConversationRepository {
  async list(): Promise<Conversation[]> {
    return loadConversations();
  }

  async create(titulo?: string | null): Promise<Conversation> {
    const conv = createConversation();
    if (titulo) conv.title = titulo.slice(0, 40);
    const all = [conv, ...loadConversations()];
    saveConversations(all);
    return conv;
  }

  async getDetail(id: string): Promise<Conversation> {
    const found = loadConversations().find((c) => c.id === id);
    if (!found) throw new Error(`Conversación no encontrada: ${id}`);
    return found;
  }

  async appendMessage(id: string, message: Message): Promise<void> {
    const all = loadConversations();
    const next = addMessage(
      all,
      id,
      message.role,
      message.type,
      message.content,
      message.timestamp,
      undefined,
      message.isError,
    );
    saveConversations(next);
  }

  async delete(id: string): Promise<void> {
    saveConversations(deleteConversation(loadConversations(), id));
  }

  async saveAll(conversations: Conversation[]): Promise<boolean> {
    return saveConversations(conversations);
  }
}

const localRepo = new LocalStorageRepository();

/** Resuelve el repositorio activo según `conversationApiBase` del embed. */
export function getConversationRepository(): ConversationRepository {
  const base = getEmbedRuntimeConfig().conversationApiBase;
  if (base) return new RemoteConversationRepository(base);
  return localRepo;
}

export function isRemoteConversationMode(): boolean {
  return Boolean(getEmbedRuntimeConfig().conversationApiBase);
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

export function deleteConversation(
  conversations: Conversation[],
  convId: string,
): Conversation[] {
  return conversations.filter((c) => c.id !== convId);
}
