import { useCallback, useEffect, useRef, useState } from 'react';
import { ChatButton } from './components/ChatButton';
import { ChatModal } from './components/ChatModal';
import { useConversations } from './hooks/useConversations';
import { useChat } from './hooks/useChat';
import { t } from './i18n';

const HIDE_ANIMATION_MS = 200;

function App() {
  const conv = useConversations();
  const chat = useChat({
    ensureConversation: conv.ensureConversation,
    addMessage: conv.addMessage,
    replaceMessage: conv.replaceMessage,
  });

  const [isOpen, setIsOpen] = useState(false);
  const [animateIn, setAnimateIn] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const wasSendingRef = useRef(false);

  useEffect(() => {
    if (wasSendingRef.current && !chat.isSending && !isOpen) {
      setHasUnread(true);
    }
    wasSendingRef.current = chat.isSending;
  }, [chat.isSending, isOpen]);

  const openChat = useCallback(() => {
    setIsOpen(true);
    setHasUnread(false);
    requestAnimationFrame(() => requestAnimationFrame(() => setAnimateIn(true)));
  }, []);

  const hideChat = useCallback((afterClose?: () => void) => {
    setAnimateIn(false);
    window.setTimeout(() => {
      setIsOpen(false);
      afterClose?.();
    }, HIDE_ANIMATION_MS);
  }, []);

  const resetWidget = useCallback(() => {
    setIsFullscreen(false);
    setHistoryOpen(false);
    conv.startNewConversation();
    chat.setSelectedImage(null);
    setLightboxSrc(null);
  }, [conv, chat]);

  const minimizeChat = useCallback(() => hideChat(), [hideChat]);
  const closeChat = useCallback(() => hideChat(resetWidget), [hideChat, resetWidget]);

  // Entrar a pantalla completa abre el historial por defecto; salir lo
  // cierra, para no dejarlo como overlay de golpe al encoger el modal.
  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((f) => {
      const next = !f;
      setHistoryOpen(next);
      return next;
    });
  }, []);

  const toggleHistory = useCallback(() => setHistoryOpen((h) => !h), []);
  const closeHistory = useCallback(() => setHistoryOpen(false), []);

  const handleNewConversation = useCallback(() => {
    conv.startNewConversation();
    chat.setSelectedImage(null);
    setLightboxSrc(null);
  }, [conv, chat]);

  return (
    <div className="flex items-center justify-center relative overflow-hidden h-screen">
      <div className="text-center text-gray-500 max-w-md px-4">
        <h1 className="text-2xl font-medium text-white mb-2">{t('demoTitle')}</h1>
        <p className="text-sm">
          {t('demoDescriptionBefore')} <b>Mateo Support</b> {t('demoDescriptionAfter')}
        </p>
      </div>

      {!isOpen && <ChatButton onClick={openChat} hasUnread={hasUnread} />}

      {isOpen && (
        <ChatModal
          modal={{
            animateIn,
            isFullscreen,
            onToggleFullscreen: toggleFullscreen,
            onMinimize: minimizeChat,
            onClose: closeChat,
          }}
          history={{
            conversations: conv.conversations,
            currentConversationId: conv.currentConversationId,
            onSelect: conv.loadConversation,
            onNewConversation: handleNewConversation,
            onDeleteConversation: conv.deleteConversation,
            onClearAll: conv.clearAllConversations,
            isOpen: historyOpen,
            onToggle: toggleHistory,
            onClose: closeHistory,
          }}
          chat={{
            visibleMessages: conv.visibleMessages,
            isSending: chat.isSending,
            selectedImage: chat.selectedImage,
            onImageSelected: chat.setSelectedImage,
            onImageRemoved: () => chat.setSelectedImage(null),
            onSend: chat.sendMessage,
          }}
          lightbox={{
            src: lightboxSrc,
            onOpen: setLightboxSrc,
            onClose: () => setLightboxSrc(null),
          }}
        />
      )}
    </div>
  );
}

export default App;
