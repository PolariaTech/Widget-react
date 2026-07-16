import type { Conversation } from '../types';
import { HistoryPanel } from './HistoryPanel';
import { SidebarToggleIcon } from './SidebarToggleIcon';
import { t } from '../i18n';
import { useFocusRestore } from '../hooks/useFocusRestore';

interface HistorySidebarProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
  onCollapse: () => void;
}

/**
 * Modo pantalla completa: columna izquierda persistente (como Gemini/ChatGPT/
 * Claude) — la conversación sigue visible en el panel principal a la derecha.
 * El botón de colapsar vive aquí, junto al panel que controla, en vez de en
 * el header principal (ver Header.tsx para el botón de expandir cuando está
 * colapsado).
 */
export function HistorySidebar({ conversations, currentConversationId, onSelect, onNewConversation, onDeleteConversation, onClearAll, onCollapse }: HistorySidebarProps) {
  useFocusRestore();

  return (
    <div className="w-[260px] h-full shrink-0 flex flex-col border-r border-[rgba(0,229,204,0.1)] bg-black/10">
      <div className="flex items-center gap-[8px] px-[16px] py-[12px] border-b border-[rgba(0,229,204,0.08)] shrink-0">
        <button
          onClick={onCollapse}
          className="flex items-center justify-center rounded-[8px] w-[28px] h-[28px] hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent shrink-0"
          aria-label={t('historySidebarHide')}
          title={t('historySidebarHide')}
        >
          <SidebarToggleIcon />
        </button>
        <span className="text-[13px] font-semibold text-[#f8f8f6]">{t('historySidebarTitle')}</span>
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
