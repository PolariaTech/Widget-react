/**
 * useChat — flujo de envío de mensajes (texto y/o imagen) al webhook de n8n
 * (portado de sendMessage/finishAiReply en js/chat.js).
 *
 * La condición de carrera del turno de IA se resuelve capturando
 * `capturedConvId` de forma síncrona, antes de cualquier `await`. En modo
 * remoto el id local `conv_*` puede remapease a UUID mientras n8n responde;
 * `addMessage` / `replaceMessage` resuelven ese alias para no perder la burbuja.
 *
 * Para n8n se usa `resolveConversationIdForN8n`: en embed es el UUID de
 * Supabase (`id_conversacion`), no el `conv_*` temporal del cliente.
 *
 * POL-291: antes del POST a n8n se persiste el mensaje de usuario y se envía
 * `message_id` = `widget_mensaje.id_mensaje` (estable en reintentos JWT).
 */
import { useCallback, useRef, useState } from 'react';
import type { Message, SelectedImage } from '../types';
import { uploadToCloudinary } from '../lib/cloudinary';
import { buildImageMessage, buildTextMessage, sendToN8n } from '../lib/webhook';
import { t } from '../i18n';

export interface UseChatArgs {
  ensureConversation: () => string;
  /** Resuelve el id que n8n debe usar como session key (UUID remoto en embed). */
  resolveConversationIdForN8n: (convId: string) => Promise<string>;
  /** Persiste el mensaje de usuario y devuelve `message_id` para el body de n8n. */
  persistUserMessageForN8n: (convId: string, message: Message) => Promise<string>;
  addMessage: (
    convId: string,
    role: 'user' | 'ai',
    type: 'text' | 'image',
    content: string,
    timestamp?: number,
    titleOverride?: string,
    isError?: boolean,
    syncRemote?: boolean,
  ) => void;
  replaceMessage: (
    convId: string,
    type: 'text' | 'image',
    timestamp: number,
    newContent: string,
    newType?: 'text' | 'image',
    syncRemote?: boolean,
  ) => void;
}

export interface UseChatResult {
  isSending: boolean;
  selectedImage: SelectedImage | null;
  setSelectedImage: (image: SelectedImage | null) => void;
  sendMessage: (text: string) => Promise<void>;
}

export function useChat({
  ensureConversation,
  resolveConversationIdForN8n,
  persistUserMessageForN8n,
  addMessage,
  replaceMessage,
}: UseChatArgs): UseChatResult {
  const [isSending, setIsSending] = useState(false);
  const [selectedImage, setSelectedImage] = useState<SelectedImage | null>(null);
  // Espejo síncrono de `isSending`: el guard de abajo necesita el valor real
  // en el instante exacto de la llamada, no el de la última vez que React
  // renderizó — dos llamadas a `sendMessage` disparadas antes de un re-render
  // (ej. Enter mantenido presionado) verían el mismo `isSending` state stale.
  const isSendingRef = useRef(false);

  const sendMessage = useCallback(
    async (rawText: string) => {
      if (isSendingRef.current) return;

      const capturedText = rawText.trim();
      const capturedImage = selectedImage;
      if (!capturedText && !capturedImage) return;

      const capturedConvId = ensureConversation();
      const sentAt = Date.now();

      isSendingRef.current = true;
      setSelectedImage(null);
      setIsSending(true);

      try {
        if (capturedImage) {
          // Se persiste primero con la Data URL local para que se vea de
          // inmediato mientras se sube a Cloudinary en segundo plano. Si hay
          // caption, se usa como título de la conversación en vez del default
          // "Imagen" (ver storage.ts). syncRemote=false: el id_mensaje se
          // obtiene al persistir el contenido final (URL) antes de n8n.
          addMessage(
            capturedConvId,
            'user',
            'image',
            capturedImage.data,
            sentAt,
            capturedText || undefined,
            undefined,
            false,
          );

          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            replaceMessage(capturedConvId, 'image', sentAt, t('imageSendFailed'), 'text', false);
            addMessage(capturedConvId, 'ai', 'text', t('offlineError'), Date.now(), undefined, true);
            return;
          }

          let imageUrl: string;
          try {
            imageUrl = await uploadToCloudinary(capturedImage.data, capturedImage.type);
          } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            // Reemplaza el base64 local por un placeholder corto: si se deja el
            // Data URL (hasta ~6.7MB para una imagen de 5MB) persistido para
            // siempre en localStorage, unas pocas fallas agotan la cuota del
            // navegador (~5-10MB) y todo guardado futuro empieza a fallar en silencio.
            replaceMessage(capturedConvId, 'image', sentAt, t('imageSendFailed'), 'text', false);
            addMessage(capturedConvId, 'ai', 'text', t('imageProcessError', { message }), Date.now(), undefined, true);
            return;
          }

          replaceMessage(capturedConvId, 'image', sentAt, imageUrl, 'image', false);

          const n8nConvId = await resolveConversationIdForN8n(capturedConvId);
          const messageId = await persistUserMessageForN8n(capturedConvId, {
            role: 'user',
            type: 'image',
            content: imageUrl,
            caption: capturedText || undefined,
            timestamp: sentAt,
          });

          // Un solo POST: image_url + pie en message_text/image_caption (POL-245/291).
          const imageReply = await sendToN8n(
            buildImageMessage(imageUrl, n8nConvId, messageId, capturedText || undefined),
          );
          addMessage(capturedConvId, 'ai', 'text', imageReply.text, Date.now(), undefined, imageReply.isError);
        } else {
          // syncRemote=false: persistUserMessageForN8n guarda una sola vez y
          // obtiene id_mensaje antes del webhook (POL-291).
          addMessage(capturedConvId, 'user', 'text', capturedText, sentAt, undefined, undefined, false);

          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            addMessage(capturedConvId, 'ai', 'text', t('offlineError'), Date.now(), undefined, true);
            return;
          }

          const n8nConvId = await resolveConversationIdForN8n(capturedConvId);
          const messageId = await persistUserMessageForN8n(capturedConvId, {
            role: 'user',
            type: 'text',
            content: capturedText,
            timestamp: sentAt,
          });
          const reply = await sendToN8n(buildTextMessage(capturedText, n8nConvId, messageId));
          addMessage(capturedConvId, 'ai', 'text', reply.text, Date.now(), undefined, reply.isError);
        }
      } catch (err) {
        console.warn('[useChat] no se pudo resolver conversation_id / message_id para n8n:', err);
        addMessage(
          capturedConvId,
          'ai',
          'text',
          t('webhookConnectionError'),
          Date.now(),
          undefined,
          true,
        );
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    },
    [
      selectedImage,
      ensureConversation,
      resolveConversationIdForN8n,
      persistUserMessageForN8n,
      addMessage,
      replaceMessage,
    ],
  );

  return { isSending, selectedImage, setSelectedImage, sendMessage };
}
