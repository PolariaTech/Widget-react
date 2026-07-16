/**
 * useChat — flujo de envío de mensajes (texto y/o imagen) al webhook de n8n
 * (portado de sendMessage/finishAiReply en js/chat.js).
 *
 * La condición de carrera del turno de IA se resuelve capturando
 * `capturedConvId` de forma síncrona, antes de cualquier `await`. En modo
 * remoto el id local `conv_*` puede remapease a UUID mientras n8n responde;
 * `addMessage` / `replaceMessage` resuelven ese alias para no perder la burbuja.
 */
import { useCallback, useRef, useState } from 'react';
import type { SelectedImage } from '../types';
import { uploadToCloudinary } from '../lib/cloudinary';
import { buildImageMessage, buildTextMessage, sendToN8n } from '../lib/webhook';
import { t } from '../i18n';

export interface UseChatArgs {
  ensureConversation: () => string;
  addMessage: (convId: string, role: 'user' | 'ai', type: 'text' | 'image', content: string, timestamp?: number, titleOverride?: string, isError?: boolean) => void;
  replaceMessage: (convId: string, type: 'text' | 'image', timestamp: number, newContent: string, newType?: 'text' | 'image') => void;
}

export interface UseChatResult {
  isSending: boolean;
  selectedImage: SelectedImage | null;
  setSelectedImage: (image: SelectedImage | null) => void;
  sendMessage: (text: string) => Promise<void>;
}

export function useChat({ ensureConversation, addMessage, replaceMessage }: UseChatArgs): UseChatResult {
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
          // "Imagen" (ver storage.ts).
          addMessage(capturedConvId, 'user', 'image', capturedImage.data, sentAt, capturedText || undefined);
          if (capturedText) addMessage(capturedConvId, 'user', 'text', capturedText, sentAt);

          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            replaceMessage(capturedConvId, 'image', sentAt, t('imageSendFailed'), 'text');
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
            replaceMessage(capturedConvId, 'image', sentAt, t('imageSendFailed'), 'text');
            addMessage(capturedConvId, 'ai', 'text', t('imageProcessError', { message }), Date.now(), undefined, true);
            return;
          }

          replaceMessage(capturedConvId, 'image', sentAt, imageUrl);

          // El body plano de n8n no tiene un campo de caption aparte (ver
          // webhook.ts) — la imagen y su caption (si la hay) se envían como
          // dos mensajes secuenciales, cada uno con su propia respuesta de
          // Mateo, igual que ya se muestran como dos burbujas de entrada
          // separadas arriba.
          const imageReply = await sendToN8n(buildImageMessage(imageUrl));
          addMessage(capturedConvId, 'ai', 'text', imageReply.text, Date.now(), undefined, imageReply.isError);

          if (capturedText) {
            const captionReply = await sendToN8n(buildTextMessage(capturedText));
            addMessage(capturedConvId, 'ai', 'text', captionReply.text, Date.now(), undefined, captionReply.isError);
          }
        } else {
          addMessage(capturedConvId, 'user', 'text', capturedText, sentAt);

          if (typeof navigator !== 'undefined' && !navigator.onLine) {
            addMessage(capturedConvId, 'ai', 'text', t('offlineError'), Date.now(), undefined, true);
            return;
          }

          const reply = await sendToN8n(buildTextMessage(capturedText));
          addMessage(capturedConvId, 'ai', 'text', reply.text, Date.now(), undefined, reply.isError);
        }
      } finally {
        isSendingRef.current = false;
        setIsSending(false);
      }
    },
    [selectedImage, ensureConversation, addMessage, replaceMessage],
  );

  return { isSending, selectedImage, setSelectedImage, sendMessage };
}
