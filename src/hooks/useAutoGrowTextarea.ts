/**
 * useAutoGrowTextarea — ajusta la altura de un <textarea> a la de su
 * contenido (hasta el límite `max-h-[120px]` definido en Tailwind sobre el
 * propio elemento; de ahí en adelante el `overflow-y-auto` del textarea
 * empieza a scrollear). Portado de autoGrowMessageInput (js/ui.js).
 *
 * Se recalcula en cada cambio de `value` — incluye la limpieza programática
 * del campo al enviar un mensaje o reiniciar la conversación, que en el DOM
 * clásico no disparaba un evento `input` y por eso ahí requería una llamada
 * manual; aquí basta con que `value` cambie para que el efecto corra de nuevo.
 */
import { useLayoutEffect, useRef } from 'react';

export function useAutoGrowTextarea(value: string): React.RefObject<HTMLTextAreaElement | null> {
  const ref = useRef<HTMLTextAreaElement | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight}px`;
  }, [value]);

  return ref;
}
