/**
 * Registro de handlers del UI montado (cierre de chat, etc.) para que
 * `embed.ts` / `onAuthError` puedan controlar el modal sin acoplarse a React.
 */
type CloseHandler = () => void;

let closeHandler: CloseHandler | null = null;

export function registerChatCloseHandler(handler: CloseHandler): () => void {
  closeHandler = handler;
  return () => {
    if (closeHandler === handler) closeHandler = null;
  };
}

/** Cierra el modal del chat si hay una instancia montada. */
export function closeChatFromHost(): void {
  closeHandler?.();
}
