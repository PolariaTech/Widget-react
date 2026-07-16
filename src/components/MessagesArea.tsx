import { useEffect, useRef } from 'react';
import type { Message } from '../types';
import { MessageBubble } from './MessageBubble';
import { TypingIndicator } from './TypingIndicator';
import { t } from '../i18n';

interface MessagesAreaProps {
  messages: Message[];
  isSending: boolean;
  onImageClick: (src: string) => void;
}

// Constante de módulo (no un literal recreado en cada render): así `MessageBubble`
// recibe siempre el mismo objeto `message` para el saludo y su `memo` puede
// saltarse la reconciliación en vez de comparar un objeto "distinto" cada vez.
const GREETING_MESSAGE: Message = { role: 'ai', type: 'text', content: t('greeting'), timestamp: 0 };

/**
 * `#messages-container` (scrollable) y `#messages-column` (columna de
 * lectura, `max-w-[640px] mx-auto`) son elementos distintos a propósito: así
 * el modal puede ser tan ancho como quiera en pantalla completa mientras el
 * texto de los mensajes se mantiene a un ancho cómodo de lectura. El scroll
 * (`scrollTop`/`scrollHeight`) siempre actúa sobre el contenedor, nunca sobre
 * la columna.
 */
export function MessagesArea({ messages, isSending, onImageClick }: MessagesAreaProps) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, [messages, isSending]);

  return (
    <div id="messages-container" ref={scrollerRef} role="log" aria-live="polite" className="overflow-y-auto flex-1">
      <div id="messages-column" className="flex flex-col gap-[12px] w-full max-w-[640px] mx-auto p-[16px]">
        <MessageBubble message={GREETING_MESSAGE} />
        {messages.map((m, i) => (
          <MessageBubble key={`${m.timestamp}-${i}`} message={m} onImageClick={onImageClick} />
        ))}
        {isSending && <TypingIndicator />}
      </div>
    </div>
  );
}
