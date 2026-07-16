# Contribuir a Mateo Support Widget

> Audiencia: cualquiera que vaya a escribir código en este repositorio, incluido tú mismo dentro de 3 meses.

## Convención de ramas

Formato: `tipo/descripcion-en-kebab-case`

| Tipo | Cuándo usarlo | Ejemplo real |
|---|---|---|
| `feat/` | Nueva funcionalidad | `feat/renombrar-conversaciones` |
| `fix/` | Corrección de bug | `fix/race-condition-doble-submit` |
| `refactor/` | Cambio sin nueva funcionalidad ni fix | `refactor/extraer-sparkle-icon-compartido` |
| `docs/` | Solo documentación | `docs/agregar-adr-shadow-dom` |
| `test/` | Agregar o modificar tests | `test/cubrir-schema-version-storage` |
| `chore/` | Mantenimiento (dependencias, config) | `chore/actualizar-vitest-a-4.1.10` |
| `hotfix/` | Corrección urgente ya en producción | `hotfix/widget-no-abre-en-safari` |

Todas las ramas se crean desde `main`.

## Convención de commits

Formato: `tipo(scope): descripción en imperativo`. El `scope` es opcional pero recomendado cuando el cambio es específico de un módulo.

| Prefijo | Cuándo usar | Ejemplo real |
|---|---|---|
| `feat:` | Nueva funcionalidad | `feat(historial): agregar renombrar conversación` |
| `fix:` | Corrección de bug | `fix(useChat): evitar doble conversación al mantener Enter` |
| `refactor:` | Cambio sin nueva funcionalidad | `refactor(icons): unificar sparkle en componente compartido` |
| `docs:` | Solo documentación | `docs: agregar ADR-0001 sobre Shadow DOM` |
| `test:` | Tests | `test(storage): cubrir migración de esquema sin envelope` |
| `chore:` | Mantenimiento | `chore: instalar vitest y happy-dom` |
| `style:` | Solo formato, sin cambio de lógica | `style(header): ajustar indentación` |
| `hotfix:` | Corrección urgente en producción | `hotfix: modal se sale de pantalla en iPhone SE` |

## Definition of Done

Un cambio está terminado cuando **todo** lo siguiente es verdad — cada criterio es verificable con un comando, no una opinión:

- ✅ `npm run build` compila sin errores
- ✅ `npm run lint` pasa sin errores (`oxlint`)
- ✅ `npm run test` pasa con 0 tests fallidos
- ✅ Si el cambio toca UI, se probó manualmente en el navegador (no basta con que compile o pase el type-check) — ver `docs/TESTING.md`
- ✅ Si el cambio afecta comportamiento visible o el contrato con n8n/Cloudinary, se documentó en `CHANGELOG.md` en el mismo cambio
- ✅ Si el cambio introduce una decisión arquitectural difícil de revertir, tiene su ADR en `docs/adr/`

## Estándares de código de este proyecto

- **TypeScript estricto, sin `any`.** `.oxlintrc.json` tiene `typescript/no-explicit-any: error` y `typescript/no-unsafe-assignment: error`. Si necesitas tipar algo externo/desconocido, usa `unknown` + un type guard (ver `isMessage`/`isConversation` en `src/lib/storage.ts` como referencia).
- **Cambios quirúrgicos, no reescrituras.** Prefiere `Edit` sobre `Write` para archivos existentes. No refactorices código que no estás tocando por la tarea en curso.
- **Sin abstracciones prematuras.** No crees una utilidad compartida hasta que el mismo patrón se repita 2-3 veces (ver `SparkleIcon.tsx` — se extrajo *después* de confirmar que el mismo ícono estaba duplicado a mano en 2 componentes, no antes).
- **`lib/` se mantiene libre de React.** Los módulos de `src/lib/` no importan `react` — deben poder testearse con Vitest sin renderizar nada. La lógica de estado/orquestación vive en `hooks/`.
- **i18n obligatorio para cualquier string visible al usuario.** Nunca hardcodear un string en un componente o en `lib/` — usar `t('claveNueva')` y agregar la clave a **ambos** `src/i18n/es.ts` y `src/i18n/en.ts` (TypeScript no compila si falta en uno de los dos, por diseño).
- **Nombres de commit y PR en español**, consistente con el resto del proyecto y la documentación.

## Proceso de Pull Request

1. Crea la rama desde `main` con el formato correcto.
2. Implementa el cambio en commits atómicos siguiendo la convención de arriba.
3. Corre `npm run build && npm run lint && npm run test` y confirma que los tres pasan antes de abrir el PR.
4. Si el cambio toca UI, pruébalo en el navegador real (`npm run dev`) — flujo afectado, no solo que compile.
5. Abre el PR con: qué cambia y por qué, capturas de pantalla si es UI, cómo probarlo paso a paso.
6. Actualiza `CHANGELOG.md` en el mismo PR si el cambio es visible para el usuario o afecta el contrato con n8n/Cloudinary.
7. Solicita revisión antes de mergear.

## Cómo reportar un bug

Abre un issue con:

- Qué esperabas que pasara vs. qué pasó realmente
- Pasos exactos para reproducirlo
- Navegador y si ocurre en modo compacto, fullscreen, o ambos
- Si aplica: captura de la consola del navegador (`F12`)

## Cómo proponer una mejora

Describe: el problema actual (qué no funciona bien hoy), la mejora propuesta, y por qué vale la pena el esfuerzo frente a otras prioridades. Si la mejora implica una decisión arquitectural (nueva librería, cambio de patrón), prepárate para que se discuta como un ADR antes de implementarla — ver `docs/adr/`.
