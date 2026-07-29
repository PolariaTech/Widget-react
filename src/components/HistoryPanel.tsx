import { useMemo } from 'react';
import type { Conversation } from '../types';
import { confirmDestructiveAction } from '../lib/alerts';
import { deriveConversationTitle } from '../lib/storage';
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
        className="w-full text-left px-[12px] py-[10px] text-[12px] font-medium text-[#00E5CC] hover:bg-[rgba(0,229,204,0.08)] transition-colors border-b border-[rgba(248,248,246,0.08)] flex items-center gap-[6px] shrink-0 focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent cursor-pointer"
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
            const title = deriveConversationTitle(conv);
            return (
              <div
                key={conv.id}
                className={`group flex items-center border-b border-[rgba(248,248,246,0.05)] last:border-b-0 transition-colors ${
                  isActive
                    ? 'bg-[rgba(0,229,204,0.06)]'
                    : 'hover:bg-white/5'
                }`}
              >
                <button
                  onClick={() => onSelect(conv.id)}
                  aria-current={isActive ? 'true' : undefined}
                  className="flex-1 min-w-0 text-left px-[12px] py-[9px] focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent cursor-pointer"
                >
                  <p className="text-[12px] text-[rgba(248,248,246,0.85)] truncate">{title}</p>
                  <p className="text-[10px] text-[rgba(248,248,246,0.55)] mt-[2px]">{dateStr}</p>
                </button>
                <button
                  onClick={() => void handleDelete(conv.id, title)}
                  aria-label={t('historyDeleteItemAria', { title })}
                  className="shrink-0 mr-[8px] w-[28px] h-[28px] flex items-center justify-center rounded-[8px] text-[rgba(248,248,246,0.35)] opacity-70 group-hover:opacity-100 hover:text-[#ff7b7b] hover:bg-[rgba(255,80,80,0.12)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent cursor-pointer"
                >
                  <svg
                    className="w-[14px] h-[14px]"
                    fill="none"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 6h18"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
                    <path
                      d="M8 6V4.75A1.75 1.75 0 0 1 9.75 3h4.5A1.75 1.75 0 0 1 16 4.75V6"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M19 6v13.25A1.75 1.75 0 0 1 17.25 21H6.75A1.75 1.75 0 0 1 5 19.25V6"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M10 11v5M14 11v5"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                    />
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
          className="w-full text-left px-[12px] py-[9px] text-[11px] text-[rgba(248,248,246,0.45)] hover:text-[rgba(248,248,246,0.75)] hover:bg-white/5 transition-colors border-t border-[rgba(248,248,246,0.08)] shrink-0 focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent cursor-pointer"
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
