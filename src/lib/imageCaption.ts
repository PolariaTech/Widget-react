import type { Message } from '../types';

/** Separa URL y pie cuando el API guarda ambos en `contenido` (sin columna caption). */
export const IMAGE_CAPTION_SEP = '\n<!--mateo-caption-->\n';

export function encodeImageContent(url: string, caption?: string): string {
  const trimmed = caption?.trim();
  return trimmed ? `${url}${IMAGE_CAPTION_SEP}${trimmed}` : url;
}

export function decodeImageContent(content: string): { url: string; caption?: string } {
  const idx = content.indexOf(IMAGE_CAPTION_SEP);
  if (idx === -1) return { url: content };
  const url = content.slice(0, idx);
  const caption = content.slice(idx + IMAGE_CAPTION_SEP.length).trim();
  return caption ? { url, caption } : { url };
}

function normalizeStoredMessage(message: Message): Message {
  if (message.type !== 'image') return message;
  const { url, caption } = decodeImageContent(message.content);
  const nextCaption = message.caption?.trim() || caption;
  if (url === message.content && nextCaption === message.caption) return message;
  return nextCaption ? { ...message, content: url, caption: nextCaption } : { ...message, content: url };
}

/** Une imagen + texto del mismo envío (mismo timestamp) — historial partido pre POL-245. */
export function coalesceImageCaptionMessages(messages: Message[]): Message[] {
  const out: Message[] = [];
  for (let i = 0; i < messages.length; i++) {
    const current = normalizeStoredMessage(messages[i]!);
    const peek = messages[i + 1];
    if (
      peek &&
      !current.isError &&
      !peek.isError &&
      current.role === 'user' &&
      peek.role === 'user' &&
      current.timestamp === peek.timestamp
    ) {
      const image = current.type === 'image' ? current : peek.type === 'image' ? normalizeStoredMessage(peek) : null;
      const text = current.type === 'text' ? current : peek.type === 'text' ? peek : null;
      if (image && text) {
        const caption = image.caption?.trim() || text.content.trim();
        out.push(caption ? { ...image, caption } : image);
        i += 1;
        continue;
      }
    }
    out.push(current);
  }
  return out;
}
