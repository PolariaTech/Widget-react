# ADR-0004: Generador de IDs sin `crypto.randomUUID()`

Fecha: 2026-07-12 | Estado: Aceptado

## Contexto

Un informe de auditoría técnica (documento interno, no versionado en este repositorio) identificó como hallazgo crítico que `newWamid()` (entonces en `src/lib/webhook.ts`) llamaba a `crypto.randomUUID()` de forma síncrona y sin protección, para generar el identificador de cada mensaje saliente. `crypto.randomUUID()` no está disponible en contextos no-HTTPS ni en navegadores viejos — un escenario realista para un widget embebible de terceros, donde no se controla el contexto de despliegue del sitio anfitrión. Si la API no existe, la excepción interrumpía `sendMessage` antes de llegar a `setIsSending(false)`, dejando el botón de enviar deshabilitado permanentemente desde el primer intento, sin ningún error visible ni forma de recuperarse sin recargar la página.

## Opciones consideradas

1. **Envolver la llamada en `try/catch` con un fallback**: resuelve el síntoma puntual, pero mantiene una dependencia innecesaria de una API que no aporta ninguna garantía real aquí (el ID solo necesita ser único dentro de una sesión para correlación, no criptográficamente impredecible).
2. **Usar el mismo generador que ya usa `createConversation()`** (`src/lib/storage.ts`): `Date.now().toString(36) + Math.random().toString(36).slice(...)`. Ya probado en el proyecto, disponible en cualquier contexto sin restricciones de HTTPS.
3. **Usar una librería de generación de IDs (`nanoid`, `uuid`)**: descartado — agrega una dependencia para resolver algo que dos funciones nativas ya resuelven, y no aporta ninguna propiedad (colisión, formato) que este caso de uso necesite.

## Decisión

Opción 2. `newWamid()` genera `'wamid.' + Date.now().toString(36) + Math.random().toString(36).slice(2, 10)`, sin ninguna dependencia de `crypto`. Adicionalmente (defensa en profundidad, no solo el síntoma puntual), `sendMessage` en `useChat.ts` se envolvió en `try/finally` con `setIsSending(false)` en el `finally`, para que **cualquier** excepción síncrona futura en ese flujo no vuelva a dejar el botón bloqueado permanentemente.

## Consecuencias positivas

- Cero dependencia de `crypto.randomUUID()` en todo el flujo de envío — funciona igual en HTTP no seguro y en navegadores viejos.
- El `try/finally` en `useChat.ts` protege contra esta *clase* de bug (excepción no capturada dejando `isSending` en `true` para siempre), no solo esta instancia puntual.
- Mismo patrón que ya usaba `createConversation()` — consistencia interna, sin necesidad de justificar dos convenciones distintas de generación de IDs en el mismo proyecto.

## Consecuencias negativas

- El ID generado no es criptográficamente impredecible (no hace falta que lo sea: es un identificador de correlación en un payload que imita la forma de WhatsApp Business, no un token de seguridad — ver `docs/SEGURIDAD.md`).
- Teóricamente hay una probabilidad (muy baja) de colisión entre dos IDs generados en el mismo milisegundo con la misma cadena aleatoria — irrelevante para el uso actual (correlación de request, no clave primaria de base de datos).

## Notas de seguimiento

`newWamid()` y el campo `wamid` fueron eliminados en la reescritura de payload de POL-71/72 (el body plano actual — `{ message_text, message_type }` — no lleva ningún identificador de mensaje; ver `docs/INTEGRACIONES.md`). La decisión de este ADR sigue vigente igual: el mismo patrón (`Date.now().toString(36) + Math.random().toString(36)`) es el que usa `createConversation()` en `src/lib/storage.ts` para los IDs de conversación, que es donde queda concentrado hoy.
