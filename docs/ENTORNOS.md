# Entornos — Mateo Support Widget

> Audiencia: cualquiera que necesite saber qué configuración usa el widget en cada etapa, o cómo promover un cambio de uno al siguiente.

## Los tres entornos y su propósito

| Entorno | Propósito y reglas |
|---|---|
| **Desarrollo (dev)** | Para experimentar libremente en local. Usa el workflow de n8n y la cuenta de Cloudinary de prueba ya configurados en `.env.development` (valores no secretos, versionados en el repo). Nadie debe apuntar dev a datos/servicios de producción. |
| **Staging** | Pensado como réplica de producción con el workflow de n8n y preset de Cloudinary correspondientes a staging, para validar cambios antes de que lleguen a usuarios reales. **Todavía no existe** — falta crear `.env.staging` con las credenciales reales cuando el equipo las tenga (ver `docs/VARIABLES_DE_ENTORNO.md`). |
| **Producción (prod)** | El widget real embebido en `polaria.tech`, hablando con el workflow de n8n de producción. **Todavía no existe** — falta crear `.env.production`, además del trabajo de empaquetado como script distribuible (fuera del alcance de este repositorio por ahora). |

## Qué cambia entre entornos

| Aspecto | Dev | Staging | Producción |
|---|---|---|---|
| Archivo de configuración | `.env.development` (versionado) | `.env.staging` (no versionado — pendiente de crear) | `.env.production` (no versionado — pendiente de crear) |
| `VITE_N8N_WEBHOOK_URL` | Workflow de test de n8n | Pendiente de definir | Pendiente de definir |
| `VITE_CLOUDINARY_CLOUD_NAME` / `VITE_CLOUDINARY_UPLOAD_PRESET` | Cuenta/preset de prueba (`ujssaxx6` / `mateo_test_unsigned`) | Pendiente de definir | Pendiente de definir |
| Aislamiento de estilos (Shadow DOM) | Activo — mismo comportamiento en todos los entornos | Igual | Igual |
| Forma de servir el widget | `npm run dev` (servidor de Vite) o `npm run build` + `npm run preview` | Pendiente — depende del mecanismo de embed elegido | Pendiente — depende del mecanismo de embed elegido |

A diferencia de un proyecto con backend propio (Firebase, base de datos), este widget no tiene "atajos de login" ni "modo debug" que desactivar entre entornos — no hay superficie de autenticación propia que diferenciar (ver `docs/SEGURIDAD.md`).

## Proceso de promoción

| Transición | Quién puede promoverla | Verificaciones obligatorias antes |
|---|---|---|
| dev → staging | Cualquier desarrollador | `npm run build && npm run lint && npm run test` pasan; cambio probado manualmente en navegador |
| staging → producción | Persona designada por el equipo (definir quién) | Validado en staging con el workflow de n8n correspondiente; `CHANGELOG.md` actualizado |
| Hotfix → producción | Persona designada, con aviso al equipo | El fix resuelve el problema crítico sin introducir cambios adicionales sin probar |

## Cómo crear `.env.staging` / `.env.production`

1. Copia `.env.example`.
2. Renómbralo a `.env.staging` o `.env.production` según corresponda.
3. Completa los 4 valores con las credenciales reales de ese ambiente (URL del webhook de n8n de ese ambiente, cuenta/preset de Cloudinary de ese ambiente) — ver `docs/VARIABLES_DE_ENTORNO.md` para el detalle de cada uno.
4. **No lo commitees con valores reales** — `.gitignore` ya excluye estos dos archivos por nombre, pero verifica antes de forzar un `git add`.
5. Vite lo carga automáticamente al construir con el modo correspondiente: `vite build --mode staging` / `vite build --mode production`.

## Pendiente antes de que staging/producción sean reales

- Definir con el equipo de n8n si staging/producción usan workflows de n8n separados del de desarrollo, o el mismo workflow con distinción por otro medio.
- Confirmar en la consola de Cloudinary si staging/producción comparten cuenta con dev o usan una propia (recomendado: cuentas separadas, para no mezclar archivos de prueba con reales).
- Definir el mecanismo real de embed en `polaria.tech` (empaquetado como script distribuible) — ver la nota de alcance en `README.md`.
