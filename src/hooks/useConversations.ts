/**
 * useConversations — historial de conversaciones.
 * Local: localStorage. Remoto (embed): GET/POST API WMS con debounce en mensajes.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation, Message, MessageRole, MessageType } from '../types';
import {
  addMessage as addMessageToList,
  CONVERSATIONS_STORAGE_KEY,
  createConversation,
  deleteConversation as deleteConversationFromList,
  getConversationRepository,
  isRemoteConversationMode,
  loadConversations,
  replaceMessageContent,
  saveConversations,
} from '../lib/storage';
import { showStorageQuotaError } from '../lib/alerts';

let quotaWarningShown = false;

const MESSAGE_SYNC_DEBOUNCE_MS = 400;

/** El API Nest exige UUID en `/:id/mensajes`; los ids locales `conv_*` provocan 400. */
const REMOTE_CONVERSATION_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isRemoteConversationId(id: string): boolean {
  return REMOTE_CONVERSATION_ID_RE.test(id);
}

export interface UseConversationsResult {
  conversations: Conversation[];
  currentConversationId: string | null;
  visibleMessages: Message[];
  ensureConversation: () => string;
  addMessage: (
    convId: string,
    role: MessageRole,
    type: MessageType,
    content: string,
    timestamp?: number,
    titleOverride?: string,
    isError?: boolean,
  ) => void;
  replaceMessage: (
    convId: string,
    type: MessageType,
    timestamp: number,
    newContent: string,
    newType?: MessageType,
  ) => void;
  startNewConversation: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  clearAllConversations: () => void;
}

export function useConversations(): UseConversationsResult {
  const remote = isRemoteConversationMode();
  const repo = useMemo(() => {
    void remote; // invalidar memo si el embed cambia local ↔ remoto
    return getConversationRepository();
  }, [remote]);

  const [conversations, setConversations] = useState<Conversation[]>(() =>
    remote ? [] : loadConversations(),
  );
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const currentConversationIdRef = useRef<string | null>(null);

  /** temp local id → Promise del id remoto definitivo */
  const pendingCreatesRef = useRef(new Map<string, Promise<string>>());
  /** local `conv_*` → UUID remoto tras create exitoso (useChat captura el id local) */
  const idAliasRef = useRef(new Map<string, string>());
  /** cola de sync remota por conversación */
  const pendingMessagesRef = useRef(new Map<string, Message[]>());
  const flushTimersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const setCurrentConversationIdSynced = useCallback((id: string | null) => {
    currentConversationIdRef.current = id;
    setCurrentConversationId(id);
  }, []);

  const resolveLiveConvId = useCallback((convId: string): string => {
    return idAliasRef.current.get(convId) ?? convId;
  }, []);

  const rememberIdAlias = useCallback((localId: string, remoteId: string) => {
    if (localId === remoteId) return;
    idAliasRef.current.set(localId, remoteId);
  }, []);

  const resolveRemoteId = useCallback(async (convId: string): Promise<string> => {
    const aliased = idAliasRef.current.get(convId);
    if (aliased) return aliased;
    const pending = pendingCreatesRef.current.get(convId);
    if (pending) return pending;
    return convId;
  }, []);

  const flushMessagesRef = useRef<(localConvId: string) => Promise<void>>(
    async () => undefined,
  );
  const scheduleFlushRef = useRef<(convId: string) => void>(() => undefined);

  flushMessagesRef.current = async (localConvId: string) => {
    if (!remote) return;
    const queue = pendingMessagesRef.current.get(localConvId);
    if (!queue?.length) return;
    pendingMessagesRef.current.set(localConvId, []);

    const requeue = () => {
      const prev = pendingMessagesRef.current.get(localConvId) ?? [];
      pendingMessagesRef.current.set(localConvId, [...queue, ...prev]);
    };

    try {
      let remoteId: string;
      try {
        remoteId = await resolveRemoteId(localConvId);
      } catch {
        // Create en vuelo falló: conservar cola; el próximo addMessage reprograma flush.
        requeue();
        return;
      }

      if (!isRemoteConversationId(remoteId)) {
        // Create falló antes o el id es cache local: reintentar create una vez.
        try {
          const serverConv = await repo.create(null);
          rememberIdAlias(localConvId, serverConv.id);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === localConvId
                ? {
                    ...serverConv,
                    messages: c.messages,
                    title: c.title ?? serverConv.title,
                  }
                : c,
            ),
          );
          if (currentConversationIdRef.current === localConvId) {
            setCurrentConversationIdSynced(serverConv.id);
          }
          pendingMessagesRef.current.set(serverConv.id, [
            ...queue,
            ...(pendingMessagesRef.current.get(serverConv.id) ?? []),
          ]);
          scheduleFlushRef.current(serverConv.id);
          return;
        } catch (err) {
          console.warn('create conversación remota (retry) falló:', err);
          requeue();
          return;
        }
      }

      for (const msg of queue) {
        // No persistir Data URLs enormes en el backend
        if (msg.type === 'image' && msg.content.startsWith('data:')) continue;
        if (!msg.content?.trim()) continue;
        await repo.appendMessage(remoteId, msg);
      }
    } catch (err) {
      console.warn('Sync remota de mensajes falló:', err);
      requeue();
    }
  };

  scheduleFlushRef.current = (convId: string) => {
    if (!remote) return;
    const existing = flushTimersRef.current.get(convId);
    if (existing) clearTimeout(existing);
    flushTimersRef.current.set(
      convId,
      setTimeout(() => {
        flushTimersRef.current.delete(convId);
        void flushMessagesRef.current(convId);
      }, MESSAGE_SYNC_DEBOUNCE_MS),
    );
  };

  const scheduleFlush = useCallback((convId: string) => {
    scheduleFlushRef.current(convId);
  }, []);

  const enqueueRemoteMessage = useCallback(
    (convId: string, message: Message) => {
      if (!remote) return;
      const queue = pendingMessagesRef.current.get(convId) ?? [];
      queue.push(message);
      pendingMessagesRef.current.set(convId, queue);
      scheduleFlush(convId);
    },
    [remote, scheduleFlush],
  );

  // Carga inicial remota
  useEffect(() => {
    if (!remote) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await repo.list();
        if (cancelled) return;
        setConversations(list);
      } catch (err) {
        // No mezclar ids locales `conv_*` del cache: romperían POST .../:id/mensajes (400).
        console.warn('No se pudo cargar historial remoto; se inicia vacío:', err);
        if (!cancelled) setConversations([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [remote, repo]);

  // Persistencia local (fallback / cache)
  useEffect(() => {
    if (remote) {
      // Mirror opcional en local como cache offline
      saveConversations(conversations);
      return;
    }
    const ok = saveConversations(conversations);
    if (!ok && !quotaWarningShown) {
      quotaWarningShown = true;
      void showStorageQuotaError();
    }
  }, [conversations, remote]);

  useEffect(() => {
    if (remote) return;
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key !== CONVERSATIONS_STORAGE_KEY) return;
      setConversations(loadConversations());
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, [remote]);

  const ensureConversation = useCallback((): string => {
    if (currentConversationIdRef.current) return currentConversationIdRef.current;
    const conv = createConversation();
    setConversations((prev) => [conv, ...prev]);
    setCurrentConversationIdSynced(conv.id);

    if (remote) {
      const createPromise = repo
        .create(null)
        .then((serverConv) => {
          rememberIdAlias(conv.id, serverConv.id);
          setConversations((prev) =>
            prev.map((c) =>
              c.id === conv.id
                ? { ...serverConv, messages: c.messages, title: c.title ?? serverConv.title }
                : c,
            ),
          );
          if (currentConversationIdRef.current === conv.id) {
            setCurrentConversationIdSynced(serverConv.id);
          }
          // Migrar cola pendiente al id remoto
          const queued = pendingMessagesRef.current.get(conv.id);
          if (queued?.length) {
            pendingMessagesRef.current.delete(conv.id);
            pendingMessagesRef.current.set(serverConv.id, queued);
            scheduleFlush(serverConv.id);
          }
          pendingCreatesRef.current.delete(conv.id);
          return serverConv.id;
        })
        .catch((err) => {
          console.warn('create conversación remota falló:', err);
          pendingCreatesRef.current.delete(conv.id);
          // No devolver el id local: flushMessages debe esperar un UUID real.
          throw err;
        });
      pendingCreatesRef.current.set(conv.id, createPromise);
      // Evita "Unhandled Promise Rejection" si el flush aún no await-ea.
      void createPromise.catch(() => undefined);
    }

    return conv.id;
  }, [remote, repo, scheduleFlush, setCurrentConversationIdSynced, rememberIdAlias]);

  const addMessage = useCallback(
    (
      convId: string,
      role: MessageRole,
      type: MessageType,
      content: string,
      timestamp: number = Date.now(),
      titleOverride?: string,
      isError?: boolean,
    ) => {
      // Tras create remoto el id pasa de conv_* → UUID; useChat sigue con el id local.
      const liveId = resolveLiveConvId(convId);
      setConversations((prev) =>
        addMessageToList(prev, liveId, role, type, content, timestamp, titleOverride, isError),
      );
      enqueueRemoteMessage(liveId, { role, type, content, timestamp, isError });
    },
    [enqueueRemoteMessage, resolveLiveConvId],
  );

  const replaceMessage = useCallback(
    (
      convId: string,
      type: MessageType,
      timestamp: number,
      newContent: string,
      newType?: MessageType,
    ) => {
      const liveId = resolveLiveConvId(convId);
      setConversations((prev) =>
        replaceMessageContent(prev, liveId, type, timestamp, newContent, newType),
      );
      // Sync del contenido final (p. ej. URL Cloudinary tras reemplazar data URL)
      enqueueRemoteMessage(liveId, {
        role: 'user',
        type: newType ?? type,
        content: newContent,
        timestamp,
      });
    },
    [enqueueRemoteMessage, resolveLiveConvId],
  );

  const startNewConversation = useCallback(() => {
    setCurrentConversationIdSynced(null);
  }, [setCurrentConversationIdSynced]);

  const loadConversation = useCallback(
    (id: string) => {
      setCurrentConversationIdSynced(id);
      if (!remote) return;
      void (async () => {
        try {
          const detail = await repo.getDetail(id);
          setConversations((prev) => prev.map((c) => (c.id === id ? detail : c)));
        } catch (err) {
          console.warn('No se pudo cargar detalle remoto:', err);
        }
      })();
    },
    [remote, repo, setCurrentConversationIdSynced],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => deleteConversationFromList(prev, id));
      if (currentConversationIdRef.current === id) {
        setCurrentConversationIdSynced(null);
      }
      if (remote) {
        void resolveRemoteId(id)
          .then((remoteId) => repo.delete(remoteId))
          .catch((err) => console.warn('delete remoto falló:', err));
      }
    },
    [remote, repo, resolveRemoteId, setCurrentConversationIdSynced],
  );

  const clearAllConversations = useCallback(() => {
    const ids = conversations.map((c) => c.id);
    setConversations([]);
    setCurrentConversationIdSynced(null);
    if (remote) {
      for (const id of ids) {
        void resolveRemoteId(id)
          .then((remoteId) => repo.delete(remoteId))
          .catch(() => {});
      }
    }
  }, [conversations, remote, repo, resolveRemoteId, setCurrentConversationIdSynced]);

  const visibleMessages = useMemo(() => {
    if (!currentConversationId) return [];
    return conversations.find((c) => c.id === currentConversationId)?.messages ?? [];
  }, [conversations, currentConversationId]);

  return {
    conversations,
    currentConversationId,
    visibleMessages,
    ensureConversation,
    addMessage,
    replaceMessage,
    startNewConversation,
    loadConversation,
    deleteConversation,
    clearAllConversations,
  };
}
