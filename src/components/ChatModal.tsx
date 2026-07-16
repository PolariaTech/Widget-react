import { useEffect } from 'react';
import type { Conversation, Message, SelectedImage } from '../types';
import { DEFAULT_SIZE } from '../config';
import { Header } from './Header';
import { MessagesArea } from './MessagesArea';
import { InputFooter } from './InputFooter';
import { ImageLightbox } from './ImageLightbox';
import { HistoryOverlay } from './HistoryOverlay';
import { HistorySidebar } from './HistorySidebar';

interface ModalProps {
  animateIn: boolean;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

interface HistoryProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}

interface ChatProps {
  visibleMessages: Message[];
  isSending: boolean;
  selectedImage: SelectedImage | null;
  onImageSelected: (image: SelectedImage) => void;
  onImageRemoved: () => void;
  onSend: (text: string) => void;
}

interface LightboxProps {
  src: string | null;
  onOpen: (src: string) => void;
  onClose: () => void;
}

interface ChatModalProps {
  modal: ModalProps;
  history: HistoryProps;
  chat: ChatProps;
  lightbox: LightboxProps;
}

export function ChatModal({ modal, history, chat, lightbox }: ChatModalProps) {
  const { animateIn, isFullscreen, onToggleFullscreen, onMinimize, onClose } = modal;
  const { conversations, currentConversationId, onSelect, onNewConversation, onDeleteConversation, onClearAll, isOpen: historyOpen, onToggle: onToggleHistory, onClose: onCloseHistory } = history;
  const { visibleMessages, isSending, selectedImage, onImageSelected, onImageRemoved, onSend } = chat;
  const { src: lightboxSrc, onOpen: onOpenLightbox, onClose: onCloseLightbox } = lightbox;

  // Modo modal compacto: no hay espacio para mostrar historial + conversación
  // a la vez, así que elegir/crear una conversación regresa automáticamente a
  // verla. Modo pantalla completa: el sidebar es persistente (como Gemini/
  // ChatGPT/Claude), así que se queda abierto y solo cambia qué está activa.
  const handleSelectConversation = (id: string) => {
    onImageRemoved();
    onSelect(id);
    if (!isFullscreen) onCloseHistory();
  };

  const handleNewConversation = () => {
    onNewConversation();
    if (!isFullscreen) onCloseHistory();
  };

  // Un solo listener de Escape para todo lo que puede "cerrarse": el lightbox
  // tiene prioridad (es lo más "encima"), luego el historial en modo compacto.
  // En pantalla completa el historial es un sidebar persistente (con su
  // propio botón de colapsar), no un overlay — Escape no lo toca ahí, ni
  // minimiza una sesión fullscreen que el usuario abrió a propósito.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (lightboxSrc) {
        onCloseLightbox();
        return;
      }
      if (isFullscreen) return;
      if (historyOpen) {
        onCloseHistory();
        return;
      }
      onMinimize();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [lightboxSrc, isFullscreen, historyOpen, onCloseLightbox, onCloseHistory, onMinimize]);

  return (
    <>
      {isFullscreen && <div className="fixed inset-0 z-40 bg-black/60" aria-hidden="true" />}
      <div id="chat-modal" className={`fixed z-50 ${isFullscreen ? 'inset-4' : 'bottom-6 right-6'}`}>
        <div
          id="modal-container"
          role="dialog"
          aria-modal="true"
          aria-labelledby="chat-dialog-title"
          className={`rounded-[22px] overflow-hidden shadow-2xl transform relative ${
            animateIn ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          } ${isFullscreen ? 'is-fullscreen' : ''}`}
          style={{
            width: isFullscreen ? '100%' : `min(${DEFAULT_SIZE.w}, calc(100vw - 3rem))`,
            height: isFullscreen ? '100%' : `min(${DEFAULT_SIZE.h}, calc(100vh - 3rem))`,
            backgroundImage: 'linear-gradient(159.676deg, rgba(4,14,20,0.97) 8.4861%, rgba(2,6,9,0.98) 91.514%)',
          }}
        >
          <div className="absolute border border-[rgba(0,229,204,0.18)] inset-0 pointer-events-none rounded-[22px] shadow-[0px_8px_48px_0px_rgba(0,0,0,0.6)]" />

          <div id="chat-scale-root" className={`h-full w-full relative z-10 flex ${isFullscreen ? 'flex-row' : 'flex-col'}`}>
            {isFullscreen && historyOpen && (
              <HistorySidebar
                conversations={conversations}
                currentConversationId={currentConversationId}
                onSelect={handleSelectConversation}
                onNewConversation={handleNewConversation}
                onDeleteConversation={onDeleteConversation}
                onClearAll={onClearAll}
                onCollapse={onCloseHistory}
              />
            )}

            <div className="flex flex-col h-full flex-1 min-w-0">
              <Header
                onMinimize={onMinimize}
                onClose={onClose}
                isFullscreen={isFullscreen}
                onToggleFullscreen={onToggleFullscreen}
                historyOpen={historyOpen}
                onToggleHistory={onToggleHistory}
              />

              {!isFullscreen && historyOpen ? (
                <HistoryOverlay
                  conversations={conversations}
                  currentConversationId={currentConversationId}
                  onSelect={handleSelectConversation}
                  onNewConversation={handleNewConversation}
                  onDeleteConversation={onDeleteConversation}
                  onClearAll={onClearAll}
                  onBack={onCloseHistory}
                />
              ) : (
                <>
                  <MessagesArea messages={visibleMessages} isSending={isSending} onImageClick={onOpenLightbox} />
                  <InputFooter
                    key={currentConversationId}
                    selectedImage={selectedImage}
                    onImageSelected={onImageSelected}
                    onImageRemoved={onImageRemoved}
                    onPreviewClick={onOpenLightbox}
                    onSend={onSend}
                    isSending={isSending}
                  />
                </>
              )}
            </div>
          </div>

          <ImageLightbox src={lightboxSrc} onClose={onCloseLightbox} />
        </div>
      </div>
    </>
  );
}
