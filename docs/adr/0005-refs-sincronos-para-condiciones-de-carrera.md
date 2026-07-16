# ADR-0005: Refs síncronos para las condiciones de carrera de envío

Fecha: 2026-07-12 | Estado: Aceptado

## Contexto

Dos hallazgos relacionados aparecieron durante el hardening del widget: (1) mantener presionada la tecla Enter podía crear dos conversaciones distintas en vez de una, y (2) el guard `if (isSending) return` en `sendMessage` (`useChat.ts`) podía dejar pasar un segundo envío simultáneo. La causa raíz de ambos era la misma: `ensureConversation` e `isSending` se leían desde el *closure* de un valor de `useState`, que solo se actualiza en el siguiente render de React — dos llamadas disparadas antes de que React vuelva a renderizar ven el mismo valor stale y ambas proceden.

## Opciones consideradas

1. **Debounce/throttle en el input**: mitiga el síntoma del teclado mantenido, pero no resuelve la causa raíz (dos llamadas legítimas y rápidas, no solo auto-repeat de teclado, seguirían teniendo el mismo problema).
2. **`useRef` como espejo síncrono del estado relevante**, actualizado en el mismo tick que se decide la acción (antes de cualquier `await`), leído por el guard en vez del state de React. El `useState` correspondiente se mantiene en paralelo únicamente para disparar el re-render que actualiza la UI (botón deshabilitado, spinner).
3. **Mover el estado a una librería de manejo de estado con transacciones atómicas** (Redux Toolkit, Zustand con middleware): descartado por sobre-ingeniería — el problema es puntual a dos flujos concretos, no un problema estructural de todo el árbol de estado del widget.

## Decisión

Opción 2, aplicada en dos lugares:

- `useConversations.ts`: `currentConversationIdRef` se actualiza sincrónicamente en `setCurrentConversationIdSynced()`, y `ensureConversation()` lee ese ref (no el state) para decidir si reutiliza la conversación activa o crea una nueva.
- `useChat.ts`: `isSendingRef` se pone en `true` sincrónicamente al inicio de `sendMessage`, antes de cualquier `await`, y el guard de entrada (`if (isSendingRef.current) return`) lo lee a él en vez del state `isSending`.

## Consecuencias positivas

- Verificado en navegador disparando dos eventos `keydown: Enter` sin esperar entre ellos: se crea **una sola** conversación con **un solo** mensaje (antes del fix, se creaban dos conversaciones separadas).
- El fix es local a los dos hooks afectados — no requirió cambiar la forma en que los componentes consumen `isSending`/`currentConversationId` (siguen siendo el `useState` de siempre para efectos de renderizado).
- Mismo patrón aplicado consistentemente en ambos lugares, fácil de reconocer si aparece un tercer caso similar en el futuro.

## Consecuencias negativas

- Duplica la fuente de verdad (ref + state) para estos dos valores — hay que recordar mantenerlos sincronizados si se agrega un nuevo punto de escritura (mitigado centralizando la escritura en `setCurrentConversationIdSynced()` para el caso de `currentConversationId`).
- Es un patrón que hay que entender explícitamente (ref síncrono vs. state asíncrono) — no es obvio para alguien que no conozca la razón, de ahí el comentario explicativo en el propio código además de este ADR.

## Notas de seguimiento

Si aparece un tercer flujo con el mismo patrón de "guard leído antes de que el render lo actualice", aplicar la misma solución (ref síncrono) en vez de inventar una variante nueva.
