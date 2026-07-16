import { useEffect, useRef } from 'react';
import type { Conversation } from '../types';
import { HistoryPanel } from './HistoryPanel';
import { t } from '../i18n';
import { useFocusRestore } from '../hooks/useFocusRestore';

interface HistoryOverlayProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
  onBack: () => void;
}

/**
 * Modo modal compacto: el historial reemplaza el 100% del área de mensajes +
 * input (el header se mantiene visible arriba, fuera de este componente).
 * `onBack` regresa a la conversación activa — no cierra el chat.
 */
export function HistoryOverlay({ conversations, currentConversationId, onSelect, onNewConversation, onDeleteConversation, onClearAll, onBack }: HistoryOverlayProps) {
  useFocusRestore();
  const backButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    backButtonRef.current?.focus();
  }, []);

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-[8px] px-[16px] py-[10px] border-b border-[rgba(0,229,204,0.08)] shrink-0">
        <button
          ref={backButtonRef}
          onClick={onBack}
          className="flex items-center justify-center rounded-[8px] w-[28px] h-[28px] hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent shrink-0 cursor-pointer"
          aria-label={t('historyBack')}
          title={t('historyBack')}
        >
          <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 16 16">
            <path d="M10 3L5 8L10 13" stroke="#F8F8F6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="1.4" />
          </svg>
        </button>
        <span className="text-[13px] font-semibold text-[#f8f8f6]">{t('historyOverlayTitle')}</span>
      </div>

      <div className="flex-1 min-h-0">
        <HistoryPanel
          conversations={conversations}
          currentConversationId={currentConversationId}
          onSelect={onSelect}
          onNewConversation={onNewConversation}
          onDeleteConversation={onDeleteConversation}
          onClearAll={onClearAll}
        />
      </div>
    </div>
  );
}
