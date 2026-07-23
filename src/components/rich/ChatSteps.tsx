import { useId, useState } from 'react';
import { t } from '../../i18n';

export interface ChatStepItem {
  title: string;
  detail?: string;
}

interface ChatStepsProps {
  items: ChatStepItem[];
  /** Envía una pregunta de seguimiento sobre el paso (texto → n8n). */
  onAskStep?: (prompt: string) => void;
  disabled?: boolean;
}

/**
 * Pasos interactivos: expandir detalle, marcar como hecho y preguntar a Mateo.
 */
export function ChatSteps({ items, onAskStep, disabled = false }: ChatStepsProps) {
  const baseId = useId();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [done, setDone] = useState<Record<number, boolean>>({});

  const doneCount = Object.values(done).filter(Boolean).length;
  const progress = items.length > 0 ? Math.round((doneCount / items.length) * 100) : 0;

  return (
    <div className="chat-steps my-[4px] flex flex-col gap-[8px]">
      <div className="flex items-center justify-between gap-[8px]">
        <span className="text-[10px] font-semibold uppercase tracking-[0.04em] text-[rgba(248,248,246,0.45)]">
          {t('stepsLabel')}
        </span>
        <span className="text-[10px] text-[rgba(0,229,204,0.85)] tabular-nums">
          {doneCount}/{items.length}
        </span>
      </div>

      <div
        className="h-[3px] w-full overflow-hidden rounded-full bg-[rgba(248,248,246,0.08)]"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t('stepsProgressAria', { done: String(doneCount), total: String(items.length) })}
      >
        <div
          className="h-full rounded-full bg-[#00e5cc] transition-[width] duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <ol className="flex flex-col gap-[6px] m-0 p-0 list-none">
        {items.map((item, index) => {
          const isOpen = openIndex === index;
          const isDone = Boolean(done[index]);
          const panelId = `${baseId}-panel-${index}`;
          const headerId = `${baseId}-header-${index}`;

          return (
            <li
              key={`${item.title}-${index}`}
              className={`rounded-[12px] border transition-colors ${
                isDone
                  ? 'border-[rgba(0,229,204,0.35)] bg-[rgba(0,229,204,0.1)]'
                  : 'border-[rgba(248,248,246,0.1)] bg-[rgba(248,248,246,0.03)]'
              }`}
            >
              <div className="flex items-stretch gap-[2px]">
                <button
                  type="button"
                  className="shrink-0 flex items-center justify-center w-[36px] rounded-l-[11px] text-[#00e5cc] hover:bg-[rgba(0,229,204,0.1)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5CC] focus-visible:ring-inset transition-colors"
                  aria-label={isDone ? t('stepsMarkPendingAria', { n: String(index + 1) }) : t('stepsMarkDoneAria', { n: String(index + 1) })}
                  aria-pressed={isDone}
                  onClick={() => setDone((prev) => ({ ...prev, [index]: !prev[index] }))}
                >
                  <span
                    className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[10px] font-bold transition-colors ${
                      isDone
                        ? 'border-[#00e5cc] bg-[#00e5cc] text-[#020609]'
                        : 'border-[rgba(0,229,204,0.45)] text-[rgba(0,229,204,0.9)]'
                    }`}
                    aria-hidden="true"
                  >
                    {isDone ? '✓' : index + 1}
                  </span>
                </button>

                <button
                  type="button"
                  id={headerId}
                  aria-expanded={isOpen}
                  aria-controls={panelId}
                  className="flex-1 min-w-0 text-left px-[8px] py-[9px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5CC] focus-visible:ring-inset rounded-r-[11px]"
                  onClick={() => setOpenIndex((prev) => (prev === index ? null : index))}
                >
                  <span className="flex items-start justify-between gap-[8px]">
                    <span
                      className={`chat-msg-text leading-[18px] ${
                        isDone
                          ? 'text-[rgba(248,248,246,0.55)] line-through'
                          : 'text-[rgba(248,248,246,0.92)]'
                      }`}
                    >
                      {item.title}
                    </span>
                    <svg
                      className={`mt-[2px] h-[12px] w-[12px] shrink-0 text-[rgba(248,248,246,0.4)] transition-transform duration-200 ${
                        isOpen ? 'rotate-180' : ''
                      }`}
                      viewBox="0 0 12 12"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </button>
              </div>

              <div
                id={panelId}
                role="region"
                aria-labelledby={headerId}
                hidden={!isOpen}
                className="border-t border-[rgba(248,248,246,0.06)] px-[12px] pb-[10px] pt-[8px]"
              >
                {item.detail ? (
                  <p className="chat-msg-text leading-[18px] text-[rgba(248,248,246,0.7)] mb-[8px]">
                    {item.detail}
                  </p>
                ) : (
                  <p className="chat-msg-text leading-[18px] text-[rgba(248,248,246,0.4)] mb-[8px]">
                    {t('stepsNoDetail')}
                  </p>
                )}

                {onAskStep && (
                  <button
                    type="button"
                    disabled={disabled}
                    className="inline-flex items-center gap-[5px] rounded-[8px] border border-[rgba(0,229,204,0.28)] bg-[rgba(0,229,204,0.08)] px-[10px] py-[5px] text-[11px] font-medium text-[#00e5cc] transition hover:bg-[rgba(0,229,204,0.14)] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5CC]"
                    onClick={() =>
                      onAskStep(t('stepsAskPrompt', { step: item.title }))
                    }
                  >
                    <svg className="h-[12px] w-[12px]" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                      <path
                        d="M8 14A6 6 0 108 2a6 6 0 000 12zM8 5.2v.01M8 7.2v3.6"
                        stroke="currentColor"
                        strokeWidth="1.4"
                        strokeLinecap="round"
                      />
                    </svg>
                    {t('stepsAskButton')}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
