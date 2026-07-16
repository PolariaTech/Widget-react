import { useMemo } from 'react';
import type { Conversation } from '../types';
import { confirmDestructiveAction } from '../lib/alerts';
import { t, getLocaleTag } from '../i18n';

interface HistoryPanelProps {
  conversations: Conversation[];
  currentConversationId: string | null;
  onSelect: (id: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (id: string) => void;
  onClearAll: () => void;
}

/**
 * Contenido puro del historial (botón "Nueva conversación" + lista), sin el
 * "chrome" alrededor — lo envuelve `HistoryOverlay` (modo modal, reemplaza la
 * conversación) o `HistorySidebar` (modo pantalla completa, columna
 * persistente), que sí difieren en layout.
 */
export function HistoryPanel({ conversations, currentConversationId, onSelect, onNewConversation, onDeleteConversation, onClearAll }: HistoryPanelProps) {
  const sorted = useMemo(() => [...conversations].sort((a, b) => b.updatedAt - a.updatedAt), [conversations]);

  const handleDelete = async (id: string, title: string) => {
    const confirmed = await confirmDestructiveAction(
      t('historyDeleteConvTitle'),
      t('historyDeleteConvText', { title }),
      t('historyDeleteConvConfirm'),
    );
    if (confirmed) onDeleteConversation(id);
  };

  const handleClearAll = async () => {
    const confirmed = await confirmDestructiveAction(
      t('historyClearAllTitle'),
      t('historyClearAllText'),
      t('historyClearAllConfirm'),
    );
    if (confirmed) onClearAll();
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <button
        onClick={onNewConversation}
        className="w-full text-left px-[12px] py-[10px] text-[12px] font-medium text-[#00E5CC] hover:bg-[rgba(0,229,204,0.08)] transition-colors border-b border-[rgba(248,248,246,0.08)] flex items-center gap-[6px] shrink-0 focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
      >
        <svg className="w-[12px] h-[12px]" fill="none" viewBox="0 0 12 12">
          <path d="M6 1.5V10.5M1.5 6H10.5" stroke="#00E5CC" strokeLinecap="round" strokeWidth="1.3" />
        </svg>
        {t('historyNewConversation')}
      </button>

      <div className="overflow-y-auto flex flex-col flex-1">
        {sorted.length === 0 ? (
          <div className="px-[12px] py-[16px] text-[11px] text-[rgba(248,248,246,0.35)] text-center">{t('historyEmptyState')}</div>
        ) : (
          sorted.map((conv) => {
            const isActive = conv.id === currentConversationId;
            const dateStr = new Date(conv.updatedAt).toLocaleString(getLocaleTag(), { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
            const title = conv.title || t('historyDefaultTitle');
            return (
              <div
                key={conv.id}
                className={`flex items-center border-b border-[rgba(248,248,246,0.05)] last:border-b-0 ${isActive ? 'bg-[rgba(0,229,204,0.06)]' : ''}`}
              >
                <button
                  onClick={() => onSelect(conv.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className="flex-1 min-w-0 text-left px-[12px] py-[9px] hover:bg-white/5 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
                >
                  <p className="text-[12px] text-[rgba(248,248,246,0.85)] truncate">{title}</p>
                  <p className="text-[10px] text-[rgba(248,248,246,0.55)] mt-[2px]">{dateStr}</p>
                </button>
                <button
                  onClick={() => void handleDelete(conv.id, title)}
                  aria-label={t('historyDeleteItemAria', { title })}
                  className="shrink-0 mr-[8px] w-[24px] h-[24px] flex items-center justify-center rounded-[6px] text-[rgba(248,248,246,0.3)] hover:text-[rgba(248,248,246,0.8)] hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
                >
                  <svg className="w-[12px] h-[12px]" fill="none" viewBox="0 0 12 12">
                    <path d="M2 3.5h8M4.5 3.5V2.5a1 1 0 011-1h1a1 1 0 011 1v1M4 3.5v6.5a1 1 0 001 1h2a1 1 0 001-1V3.5" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.1" />
                  </svg>
                </button>
              </div>
            );
          })
        )}
      </div>

      {sorted.length > 0 && (
        <button
          onClick={() => void handleClearAll()}
          className="w-full text-left px-[12px] py-[9px] text-[11px] text-[rgba(248,248,246,0.45)] hover:text-[rgba(248,248,246,0.75)] hover:bg-white/5 transition-colors border-t border-[rgba(248,248,246,0.08)] shrink-0 focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
        >
          {t('historyClearAllButton')}
        </button>
      )}

      <p className="px-[12px] py-[8px] text-[10px] text-[rgba(248,248,246,0.35)] text-center border-t border-[rgba(248,248,246,0.08)] shrink-0">
        {t('historyPrivacyNotice')}
      </p>
    </div>
  );
}
