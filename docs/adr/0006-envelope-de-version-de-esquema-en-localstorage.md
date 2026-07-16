# ADR-0006: Envelope de versión de esquema en `localStorage`

Fecha: 2026-07-12 | Estado: Aceptado

## Contexto

El historial de conversaciones se persiste en `localStorage` como la única fuente de verdad del lado del cliente (ver `docs/ARQUITECTURA.md`). Hasta esta decisión, se guardaba como un array plano de `Conversation[]`, sin ninguna marca de versión. Un informe de auditoría señaló esto como riesgo de mejora continua: si `Message`/`Conversation` (`src/types.ts`) cambia de forma incompatible en el futuro (por ejemplo, un campo que pasa de opcional a requerido, o cambia de tipo), no habría forma de distinguir "estos datos son de una versión más nueva del widget que este código no sabe leer" de "estos datos están corruptos" — ambos casos requieren un manejo distinto.

## Opciones consideradas

1. **No versionar, seguir confiando en los type guards existentes** (`isMessage`/`isConversation`): los type guards ya descartan registros individuales malformados, pero no pueden distinguir una versión de esquema desconocida de datos corruptos — ambos casos simplemente no matchean la forma esperada.
2. **Envelope con `schemaVersion`**: envolver el array en `{ schemaVersion: number, conversations: Conversation[] }`. Si `schemaVersion` es mayor al que el código actual conoce, se descarta explícitamente con un mensaje distinto ("versión no soportada"), en vez de intentar interpretar campos desconocidos.
3. **Migraciones automáticas entre versiones** (transformar datos de la versión N a la N+1 en tiempo de carga): más robusto a largo plazo, pero sobre-ingeniería mientras solo existe una versión de esquema (`1`) y ningún cambio incompatible real que migrar todavía.

## Decisión

Opción 2. `saveConversations()` siempre escribe `{ schemaVersion: CURRENT_SCHEMA_VERSION, conversations }`. `loadConversations()` mantiene compatibilidad hacia atrás con el formato plano anterior (detecta si el valor parseado es directamente un array), y si detecta un `schemaVersion` mayor al que conoce, descarta todo el historial de forma segura con un `console.warn` explícito, en vez de intentar leerlo parcialmente.

## Consecuencias positivas

- Backward-compatible: el historial guardado por versiones anteriores del widget (sin envelope) se sigue leyendo correctamente — verificado con un test dedicado.
- Forward-safe: si una versión futura del widget sube `CURRENT_SCHEMA_VERSION` por un cambio incompatible, una build vieja no intentará interpretar mal esos datos — los descarta con un mensaje claro en vez de fallar de forma impredecible.
- Cambio pequeño y aislado a `storage.ts` — no afectó a ningún componente ni hook que consume `conversations`.

## Consecuencias negativas

- No hay migración automática entre versiones — subir `CURRENT_SCHEMA_VERSION` hoy significa que el historial existente de los usuarios se pierde (se descarta, no se transforma). Aceptable mientras el volumen de usuarios reales sea bajo (fase de prototipo); reconsiderar si el widget llega a producción con tráfico real antes del próximo cambio de esquema.

## Notas de seguimiento

Antes del próximo cambio incompatible a `Message`/`Conversation`, evaluar si migrar automáticamente de la versión anterior es preferible a descartar el historial — depende de cuántos usuarios reales tengan historial guardado para ese momento.
