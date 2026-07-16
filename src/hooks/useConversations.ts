/**
 * useConversations — historial de conversaciones persistido en localStorage
 * (portado de js/storage.js). Fuente única de verdad para `conversations` y
 * `currentConversationId`.
 *
 * `visibleMessages` se deriva en cada render a partir de `currentConversationId`
 * + `conversations`. Esa derivación es lo que reproduce, sin lógica adicional,
 * la garantía de la condición de carrera del flujo de envío original: un
 * mensaje SIEMPRE se persiste en la conversación de la que salió, pero solo se
 * ve en pantalla si esa conversación sigue siendo la activa en el momento en
 * que React vuelve a renderizar — ver useChat.ts.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Conversation, Message, MessageRole, MessageType } from '../types';
import {
  addMessage as addMessageToList,
  CONVERSATIONS_STORAGE_KEY,
  createConversation,
  deleteConversation as deleteConversationFromList,
  loadConversations,
  replaceMessageContent,
  saveConversations,
} from '../lib/storage';
import { showStorageQuotaError } from '../lib/alerts';

// Módulo, no ref: solo debe avisarse una vez por sesión de navegador, sin
// importar cuántas veces se vuelva a montar el hook (no debería ocurrir más
// de una vez en este widget, pero evita spamear si algún día lo hace).
let quotaWarningShown = false;

export interface UseConversationsResult {
  conversations: Conversation[];
  currentConversationId: string | null;
  visibleMessages: Message[];
  /** Crea una conversación si no hay una activa, y devuelve su id de forma síncrona. */
  ensureConversation: () => string;
  addMessage: (convId: string, role: MessageRole, type: MessageType, content: string, timestamp?: number, titleOverride?: string, isError?: boolean) => void;
  replaceMessage: (convId: string, type: MessageType, timestamp: number, newContent: string, newType?: MessageType) => void;
  startNewConversation: () => void;
  loadConversation: (id: string) => void;
  deleteConversation: (id: string) => void;
  clearAllConversations: () => void;
}

export function useConversations(): UseConversationsResult {
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);

  // Espejo síncrono de `currentConversationId`: el propio state de React solo
  // se actualiza en el siguiente render, así que dos llamadas a
  // `ensureConversation` disparadas antes de que React vuelva a renderizar
  // (ej. mantener Enter presionado) verían el mismo `currentConversationId`
  // stale y cada una crearía su propia conversación. El ref siempre tiene el
  // valor más reciente en el momento exacto de la llamada.
  const currentConversationIdRef = useRef<string | null>(null);

  const setCurrentConversationIdSynced = useCallback((id: string | null) => {
    currentConversationIdRef.current = id;
    setCurrentConversationId(id);
  }, []);

  useEffect(() => {
    const ok = saveConversations(conversations);
    if (!ok && !quotaWarningShown) {
      quotaWarningShown = true;
      void showStorageQuotaError();
    }
  }, [conversations]);

  // Coordinación entre pestañas: el evento `storage` solo se dispara en OTRAS
  // pestañas/ventanas cuando una de ellas escribe en localStorage (nunca en la
  // que hizo el cambio) — sin esto, cada pestaña abierta vive con su propia
  // copia en memoria y la última en guardar pisa silenciosamente a las demás.
  useEffect(() => {
    const handleStorageEvent = (e: StorageEvent) => {
      if (e.key !== CONVERSATIONS_STORAGE_KEY) return;
      setConversations(loadConversations());
    };
    window.addEventListener('storage', handleStorageEvent);
    return () => window.removeEventListener('storage', handleStorageEvent);
  }, []);

  const ensureConversation = useCallback((): string => {
    if (currentConversationIdRef.current) return currentConversationIdRef.current;
    const conv = createConversation();
    setConversations((prev) => [conv, ...prev]);
    setCurrentConversationIdSynced(conv.id);
    return conv.id;
  }, [setCurrentConversationIdSynced]);

  const addMessage = useCallback(
    (convId: string, role: MessageRole, type: MessageType, content: string, timestamp: number = Date.now(), titleOverride?: string, isError?: boolean) => {
      setConversations((prev) => addMessageToList(prev, convId, role, type, content, timestamp, titleOverride, isError));
    },
    [],
  );

  const replaceMessage = useCallback((convId: string, type: MessageType, timestamp: number, newContent: string, newType?: MessageType) => {
    setConversations((prev) => replaceMessageContent(prev, convId, type, timestamp, newContent, newType));
  }, []);

  const startNewConversation = useCallback(() => {
    setCurrentConversationIdSynced(null);
  }, [setCurrentConversationIdSynced]);

  const loadConversation = useCallback(
    (id: string) => {
      setCurrentConversationIdSynced(id);
    },
    [setCurrentConversationIdSynced],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => deleteConversationFromList(prev, id));
      if (currentConversationIdRef.current === id) {
        setCurrentConversationIdSynced(null);
      }
    },
    [setCurrentConversationIdSynced],
  );

  const clearAllConversations = useCallback(() => {
    setConversations([]);
    setCurrentConversationIdSynced(null);
  }, [setCurrentConversationIdSynced]);

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
