# ADR-0001: Shadow DOM para aislar estilos del sitio anfitrión

Fecha: 2026-07-12 | Estado: Aceptado

## Contexto

El widget está destinado a embeberse en `polaria.tech`. El proyecto usa Tailwind CSS, cuyo *preflight* resetea estilos base globalmente con selectores `*`. Corriendo como app standalone (`npm run dev`, `index.html` propio) esto es invisible, pero si el bundle CSS se inyectara tal cual en el documento del sitio anfitrión, resetearía el CSS de *todo* `polaria.tech`, y el CSS del sitio podría filtrarse hacia adentro del widget. Un informe de auditoría técnica (documento interno, no versionado en este repositorio) marcó esto como bloqueante específicamente para el objetivo de embeberse, aunque no urgente mientras el proyecto siguiera en fase de tester único.

## Opciones consideradas

1. **Shadow DOM**: montar React dentro de un `shadowRoot` (`element.attachShadow({ mode: 'open' })`), con el CSS del widget inyectado como `<style>` dentro de ese shadow root. Pros: mismo documento (sin postMessage para comunicación), scroll/foco/eventos funcionan de forma nativa, Tailwind se puede seguir usando normal solo cambiando cómo se inyecta el CSS. Contras: algunas librerías de terceros (ver ADR-0003) no soportan correctamente vivir dentro de un shadow root.
2. **iframe con `postMessage`**: aislamiento total garantizado (CSS y JS). Contras: cada interacción con la página host (en particular, redimensionar el iframe cuando el modal pasa a fullscreen) necesita comunicación explícita vía `postMessage` — plomería significativa para lograr lo mismo que Shadow DOM da gratis al compartir el mismo documento.
3. **No aislar nada, confiar en especificidad de CSS**: descartado de inmediato — no resuelve el problema de que el preflight de Tailwind resetea con `*`, que por definición gana a cualquier especificidad razonable del lado del widget o del host.

## Decisión

Shadow DOM. `src/main.tsx` crea el shadow root sobre `#root` y monta ahí adentro tanto el `<style>` del bundle (importado con `?inline` para obtener el CSS ya procesado por Tailwind como string, no como `<link>` que Vite inyectaría en el `<head>` del documento) como el árbol de React.

## Consecuencias positivas

- El preflight de Tailwind queda naturalmente encapsulado — verificado inyectando un botón de prueba fuera del shadow root y confirmando que conserva sus estilos nativos del navegador.
- No se necesita ningún mecanismo de comunicación cross-frame para el redimensionamiento entre modo compacto y fullscreen, ni para el foco/scroll/eventos del teclado.
- El resto del árbol de componentes de React no tuvo que cambiar — Shadow DOM es transparente para React.

## Consecuencias negativas

- SweetAlert2 (diálogos de alerta/confirmación) no puede vivir dentro de un shadow root — requirió una excepción documentada por separado (ver ADR-0003).
- Fuentes cargadas vía `<link>` en el documento (Google Fonts) siguen funcionando igual (las reglas `@font-face` no están sujetas al scoping de shadow DOM), pero cualquier CSS que dependa de selectores del documento externo (`:root`, `body`) deja de aplicar dentro del shadow root — hubo que mover el estilo del `body` del arnés de pruebas standalone a `index.html` directamente, separado del CSS propio del widget.
- Este ADR resuelve el aislamiento de estilos, **no** resuelve el empaquetado del widget como script distribuible para un host arbitrario — eso sigue pendiente como trabajo futuro.

## Notas de seguimiento

Reconsiderar si, al construir el script distribuible real (fuera del alcance de este ADR), se detectan limitaciones adicionales de Shadow DOM con el sitio real de `polaria.tech` que no aparecieron en el arnés de pruebas standalone.
