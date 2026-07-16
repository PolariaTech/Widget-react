import { useEffect } from 'react';

/**
 * Al montar, recuerda qué elemento tenía el foco; al desmontar, se lo
 * devuelve. Para paneles no-modales (HistorySidebar, HistoryOverlay) donde el
 * resto de la UI sigue siendo interactuable — no atrapan Tab, solo evitan que
 * el foco se pierda hacia `document.body` cuando el elemento enfocado
 * desaparece del DOM al cerrarse.
 */
export function useFocusRestore(): void {
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    return () => {
      previouslyFocused?.focus();
    };
  }, []);
}
