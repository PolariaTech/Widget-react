import { getLocaleTag } from '../i18n';

/**
 * Formatea un timestamp (epoch ms) como hora corta ("10:32 a.m."), en la
 * zona horaria local del navegador y el idioma detectado del widget.
 *
 * @returns Hora formateada, o cadena vacía si no hay timestamp.
 */
export function formatMessageTime(timestamp: number | null | undefined): string {
  if (!timestamp) return '';
  return new Date(timestamp).toLocaleTimeString(getLocaleTag(), { hour: '2-digit', minute: '2-digit' });
}
