import { SidebarToggleIcon } from './SidebarToggleIcon';
import { SparkleIcon } from './SparkleIcon';
import { t } from '../i18n';

interface HeaderProps {
  onMinimize: () => void;
  onClose: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  historyOpen: boolean;
  onToggleHistory: () => void;
}

export function Header({ onMinimize, onClose, isFullscreen, onToggleFullscreen, historyOpen, onToggleHistory }: HeaderProps) {
  return (
    <div className="bg-gradient-to-r from-[rgba(0,229,204,0.08)] to-[rgba(0,85,200,0.06)] w-full border-b border-[rgba(0,229,204,0.1)] shrink-0">
      <div className="flex flex-row items-center gap-[12px] pb-[13px] pt-[12px] px-[16px] w-full">
        {/* En pantalla completa, el historial vive como sidebar persistente (ver HistorySidebar);
            este botón solo reaparece aquí, pegado a la esquina donde estaba el borde del sidebar,
            cuando ese sidebar está colapsado — mismo lugar de siempre para volver a abrirlo. */}
        {isFullscreen && !historyOpen && (
          <button
            onClick={onToggleHistory}
            className="flex items-center justify-center rounded-[8px] w-[28px] h-[28px] hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent shrink-0"
            aria-label={t('headerShowHistory')}
            title={t('headerShowHistory')}
          >
            <SidebarToggleIcon />
          </button>
        )}

        <div
          className="relative rounded-[12px] w-[36px] h-[36px] shrink-0 flex items-center justify-center p-px border border-[rgba(0,229,204,0.3)]"
          style={{ backgroundImage: 'linear-gradient(135deg, rgba(0,229,204,0.2) 0%, rgba(0,85,200,0.15) 100%)' }}
        >
          <SparkleIcon className="w-[30px] h-[30px] shrink-0" />
          <div className="absolute bg-[#00e5cc] rounded-full w-[10px] h-[10px] border-2 border-[#040e14]" style={{ left: '27px', top: '27px' }} />
        </div>

        <div className="flex flex-col items-start shrink-0">
          <span id="chat-dialog-title" className="font-semibold text-[#f8f8f6] text-[13px] leading-[13px] tracking-[-0.2px] whitespace-nowrap">Mateo Support</span>
          <span className="font-normal text-[#00e5cc] text-[11px] leading-[11px] pt-[2px] whitespace-nowrap">{t('headerStatus')}</span>
        </div>

        <div className="flex-1 flex justify-end items-center gap-[2px]">
          {/* En modo modal compacto, el historial reemplaza toda la conversación (ver HistoryOverlay)
              y este botón sigue siendo el toggle, igual que siempre. */}
          {!isFullscreen && (
            <button
              onClick={onToggleHistory}
              className="flex items-center justify-center rounded-[8px] w-[28px] h-[28px] hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
              title={t('headerHistoryToggle')}
              aria-label={t('headerHistoryToggle')}
            >
              <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 16 16">
                <circle cx="8" cy="8" r="6.3" stroke="#F8F8F6" strokeOpacity="0.45" strokeWidth="1.4" />
                <path d="M8 4.8V8L10.2 9.4" stroke="#F8F8F6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="1.4" />
              </svg>
            </button>
          )}

          <button
            onClick={onMinimize}
            className="flex items-center justify-center rounded-[8px] w-[28px] h-[28px] hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
            title={t('headerMinimize')}
            aria-label={t('headerMinimizeAria')}
          >
            <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 16 16">
              <path d="M3 8H13" stroke="#F8F8F6" strokeLinecap="round" strokeOpacity="0.45" strokeWidth="1.5" />
            </svg>
          </button>

          <button
            onClick={onToggleFullscreen}
            className="flex items-center justify-center rounded-[8px] w-[28px] h-[28px] hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
            title={t('headerFullscreen')}
            aria-label={t('headerFullscreen')}
          >
            {isFullscreen ? (
              <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 16 16">
                <path
                  d="M6 2v3.5A.5.5 0 015.5 6H2M10 2v3.5a.5.5 0 00.5.5H14M14 10h-3.5a.5.5 0 00-.5.5V14M6 14v-3.5A.5.5 0 005.5 10H2"
                  stroke="#F8F8F6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="1.4"
                />
              </svg>
            ) : (
              <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 16 16">
                <path
                  d="M2 6V3.5A1.5 1.5 0 013.5 2H6M10 2h2.5A1.5 1.5 0 0114 3.5V6M14 10v2.5A1.5 1.5 0 0112.5 14H10M6 14H3.5A1.5 1.5 0 012 12.5V10"
                  stroke="#F8F8F6" strokeLinecap="round" strokeLinejoin="round" strokeOpacity="0.45" strokeWidth="1.4"
                />
              </svg>
            )}
          </button>

          <button onClick={onClose} className="flex items-center justify-center rounded-[8px] w-[28px] h-[28px] hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent" aria-label={t('headerClose')}>
            <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 16 16">
              <path d="M4 4L12 12M12 4L4 12" stroke="#F8F8F6" strokeLinecap="round" strokeOpacity="0.45" strokeWidth="1.5" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
