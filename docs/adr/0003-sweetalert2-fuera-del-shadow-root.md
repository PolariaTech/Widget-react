# ADR-0003: El tema de SweetAlert2 vive fuera del shadow root

Fecha: 2026-07-12 | Estado: Aceptado

## Contexto

Tras decidir montar el widget dentro de un shadow root (ADR-0001), se intentó redirigir los diálogos de SweetAlert2 (`lib/alerts.ts`) para que también vivieran ahí adentro, pasando un elemento del shadow root como su opción `target`. Al probarlo en navegador, cualquier diálogo lanzaba `TypeError: Cannot set properties of null (setting 'onclick')`.

## Investigación

Se leyó el código fuente de SweetAlert2 (`node_modules/sweetalert2/dist/sweetalert2.all.js`) para confirmar la causa raíz antes de intentar más workarounds. La función interna `getContainer()` está codificada así:

```js
const getContainer = () => document.body.querySelector(`.${swalClasses.container}`);
```

Esto ignora por completo el `target` que se le pasa a `Swal.fire()` para efectos de sus propias búsquedas internas (botones, título, etc.) — el `target` solo controla dónde se *anexa* el popup, no dónde SweetAlert2 lo *busca* después. Como el contenido de un shadow root no es alcanzable vía `document.body.querySelector(...)` (por diseño del propio Shadow DOM), todas las referencias internas de SweetAlert2 (`domCache.confirmButton`, etc.) resultan `null`, y sus propios manejadores de eventos truenan al intentar usarlas.

## Opciones consideradas

1. **Insistir con `target` apuntando al shadow root**: descartado — no es una limitación de configuración nuestra, es un comportamiento codificado en la librería (confirmado leyendo su fuente, no por prueba y error).
2. **Reemplazar SweetAlert2 por una implementación propia en React** (modal/diálogo dentro del árbol de componentes, totalmente compatible con shadow DOM): más correcto a largo plazo, pero un rediseño mayor de las 5 funciones de `alerts.ts` y su patrón `confirmButtonText`/`showCancelButton`, fuera de alcance de la tarea puntual de aislamiento de estilos.
3. **Dejar que SweetAlert2 siga montándose en `document.body` (su comportamiento por defecto) y mover solo su hoja de tema (`swalTheme.css`) fuera del shadow root**, inyectada normalmente en el `<head>` del documento.

## Decisión

Opción 3. `src/swalTheme.css` (las clases `.mateo-swal-*`) se importa en `main.tsx` de forma normal (sin `?inline`), para que Vite la inyecte como CSS de documento de costumbre. `alerts.ts` ya no intenta pasar ningún `target` — SweetAlert2 sigue usando su comportamiento nativo de montarse en `document.body`.

## Consecuencias positivas

- Los diálogos de alerta/confirmación se ven exactamente igual que antes (verificado visualmente) — cero regresión de UX.
- Es la única porción de CSS del widget que queda intencionalmente fuera del shadow root, acotada a un puñado de clases con prefijo único (`mateo-swal-*`), bajo riesgo real de colisión con el CSS de `polaria.tech`.
- No requirió ningún cambio en la lógica de `alerts.ts` más allá de quitar el intento de `target`.

## Consecuencias negativas

- El aislamiento de estilos del widget no es 100% completo — esta hoja de ~70 líneas de CSS es una excepción deliberada y documentada, no un descuido.
- Si en el futuro se reemplaza SweetAlert2 por una solución 100% compatible con shadow DOM (opción 2 de arriba), este ADR debería marcarse como Reemplazado.

## Notas de seguimiento

Si el equipo decide invertir en una implementación de diálogos 100% propia en React (eliminando la dependencia de SweetAlert2), revisar este ADR y el ADR-0001 en conjunto.
