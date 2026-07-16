# ADR-0002: i18n propio (sin librería) en vez de react-i18next

Fecha: 2026-07-12 | Estado: Aceptado

## Contexto

Se confirmó la necesidad de soportar español e inglés en el widget, con detección automática por `navigator.language` (sin selector de idioma en la UI, el idioma no cambia dentro de una sesión). El proyecto ya tenía un precedente de cuidar el tamaño del bundle (SweetAlert2 se carga de forma diferida por representar ~22KB gzip de un total dominado por dos mensajes de error poco frecuentes).

## Opciones consideradas

1. **react-i18next + i18next**: estándar de facto del ecosistema React. Pros: maduro, soporta pluralización compleja, interpolación avanzada, namespaces, carga diferida de idiomas. Contras: ~40KB combinados entre las dos librerías, gran parte de esa funcionalidad (namespaces, pluralización compleja, Context/Provider reactivo) no tiene uso real en un proyecto de 2 idiomas fijos y un puñado de strings cortos sin pluralización.
2. **Objeto plano + función `t()` propia**: diccionarios `es.ts`/`en.ts` con las mismas claves, una función `t(key, vars)` que interpola `{{variable}}` con `String.replace`, resuelta como función de módulo (no hook/Context). Pros: prácticamente sin overhead de bundle, mismo patrón usable tanto en componentes React como en módulos puros de `lib/` que no tienen árbol de React. Contras: sin pluralización real, sin carga diferida de idiomas (ambos diccionarios siempre están en el bundle), requiere disciplina manual para mantener paridad de claves entre los dos diccionarios.
3. **Librería más ligera (ej. `@lingui/core` en modo mínimo)**: se descartó sin evaluación profunda — sigue siendo overhead innecesario para un caso de uso que un objeto plano resuelve directamente.

## Decisión

Objeto plano + `t()` propia. La paridad de claves entre `es.ts` y `en.ts` se garantiza en tiempo de compilación: `en.ts` tipa su diccionario como `Record<keyof typeof es, string>`, así que agregar una clave nueva en español y olvidarla en inglés es un error de TypeScript, no un bug silencioso en producción.

## Consecuencias positivas

- Overhead de bundle marginal (un objeto de strings, sin runtime de librería).
- El mismo `t()` funciona igual en componentes (`Header.tsx`) y en módulos puros (`alerts.ts`, `storage.ts`, `webhook.ts`) sin necesitar dos sistemas de traducción distintos ni prop-drilling.
- Sin Context/Provider: no hay riesgo de "until until useContext resuelve" ni de re-renders innecesarios por cambios de idioma que nunca ocurren dentro de una sesión.

## Consecuencias negativas

- Sin selector de idioma en tiempo de ejecución — si el negocio pide eso en el futuro, este diseño necesita revisarse (pasar de "función de módulo resuelta una vez" a un estado reactivo).
- Sin pluralización real (`{{count}} mensaje(s)`) — hoy no hace falta, pero si aparece esa necesidad, requiere lógica manual adicional en `t()`.
- Sin carga diferida por idioma: ambos diccionarios (`es.ts` + `en.ts`) están siempre en el bundle final, aunque solo uno se use por sesión — el costo es bajo dado el tamaño actual (decenas de strings cortos), pero podría reconsiderarse si el número de claves crece mucho.

## Notas de seguimiento

Reconsiderar esta decisión si: (a) el negocio pide un selector de idioma manual en la UI, (b) se agrega un tercer idioma con necesidades de pluralización, o (c) el número de claves de traducción crece lo suficiente como para que la carga diferida por idioma empiece a importar para el tamaño del bundle.
