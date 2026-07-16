import { memo } from 'react';
import type { Message } from '../types';
import { formatMessageTime } from '../lib/format';
import { AiIcon } from './AiIcon';
import { t } from '../i18n';

interface MessageBubbleProps {
  message: Message;
  onImageClick?: (src: string) => void;
}

/** `memo`: en conversaciones largas, agregar un mensaje nuevo no debe volver a reconciliar cada burbuja anterior — solo re-renderiza si su propio `message`/`onImageClick` cambia. */
export const MessageBubble = memo(function MessageBubble({ message, onImageClick }: MessageBubbleProps) {
  const timeStr = formatMessageTime(message.timestamp);
  const isUser = message.role === 'user';

  const time = timeStr ? (
    <span className={`chat-msg-time text-[rgba(248,248,246,0.55)] mt-[3px] ${isUser ? 'pr-[2px]' : 'pl-[2px]'}`}>{timeStr}</span>
  ) : null;

  if (isUser) {
    return (
      <div className="flex justify-end w-full">
        <div className="flex flex-col items-end max-w-[80%]">
          {message.type === 'image' ? (
            <div className="bg-[rgba(0,229,204,0.08)] border border-[rgba(0,229,204,0.18)] rounded-bl-[14px] rounded-br-[4px] rounded-tl-[14px] rounded-tr-[14px] p-[8px]">
              {/* `src` se asigna vía atributo JSX normal, nunca interpolado en un string de
                  innerHTML — la URL puede venir de la respuesta de Cloudinary, no solo de
                  input local. */}
              <img
                className="chat-image max-w-full rounded-[8px] max-h-[180px] object-contain block cursor-pointer hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
                src={message.content}
                alt={t('sentImageAlt')}
                role="button"
                tabIndex={0}
                onClick={() => onImageClick?.(message.content)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onImageClick?.(message.content);
                  }
                }}
              />
            </div>
          ) : (
            <div className="bg-[rgba(0,229,204,0.08)] border border-[rgba(0,229,204,0.18)] rounded-bl-[14px] rounded-br-[4px] rounded-tl-[14px] rounded-tr-[14px] px-[13px] py-[9px]">
              <p className="chat-msg-text leading-[19px] text-[rgba(248,248,246,0.92)] whitespace-pre-wrap break-words">{message.content}</p>
            </div>
          )}
          {time}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-[8px] items-end w-full">
      <AiIcon />
      <div className="flex flex-col items-start max-w-[80%]">
        <div
          className={
            message.isError
              ? 'bg-[rgba(239,68,68,0.08)] border border-[rgba(239,68,68,0.25)] rounded-bl-[4px] rounded-br-[14px] rounded-tl-[14px] rounded-tr-[14px] px-[13px] py-[9px] flex items-start gap-[6px]'
              : 'bg-[rgba(248,248,246,0.05)] border border-[rgba(248,248,246,0.07)] rounded-bl-[4px] rounded-br-[14px] rounded-tl-[14px] rounded-tr-[14px] px-[13px] py-[9px]'
          }
        >
          {message.isError && (
            <svg className="w-[14px] h-[14px] mt-[2px] shrink-0" fill="none" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 5.5V8.5M8 11H8.01M7.09 2.15L1.4 12a1.2 1.2 0 001.04 1.8h11.12A1.2 1.2 0 0014.6 12L8.91 2.15a1.05 1.05 0 00-1.82 0z" stroke="#ef4444" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.3" />
            </svg>
          )}
          <p className="chat-msg-text leading-[19px] text-[rgba(248,248,246,0.85)] whitespace-pre-wrap break-words">
            {message.isError && <span className="sr-only">{t('errorReplyLabel')}: </span>}
            {message.content}
          </p>
        </div>
        {time}
      </div>
    </div>
  );
});
