# Checklist maestra de documentación — Mateo Support Widget

> Adaptada de la Guía de Documentación de Software v2.0 (checklist de 20 puntos) al contexto real de este proyecto: un widget de chat **frontend puro**, sin backend ni base de datos propios, que consume dos APIs externas (n8n, Cloudinary) en vez de exponer una propia. Varios puntos de la guía original están escritos pensando en un sistema con backend/base de datos (ej. Firebase, Firestore, RBAC de servidor) — se adaptaron o se marcaron explícitamente como no aplicables, con la razón, en vez de forzar contenido que no corresponde a este proyecto.

| # | Elemento de documentación | Prioridad original | Aplica a este proyecto | Estado |
|---|---|---|---|---|
| 1 | README.md — portada del proyecto | Alta | Sí, tal cual | ✅ Hecho — `README.md` |
| 2 | Diagrama de arquitectura del sistema | Alta | Sí, adaptado (C4 nivel 1-2 + flujo de un mensaje) | ✅ Hecho — `docs/ARQUITECTURA.md` |
| 3 | Documentación de API (OpenAPI/Swagger) | Alta | **No literalmente** — el widget no expone ninguna API propia. Adaptado a documentar el *contrato de consumo* de las dos APIs externas (n8n, Cloudinary) | ✅ Hecho, adaptado — `docs/INTEGRACIONES.md` |
| 4 | Variables de entorno y configuración | Alta | Sí, tal cual | ✅ Hecho — `docs/VARIABLES_DE_ENTORNO.md` |
| 5 | Guía de instalación y ejecución local | Alta | Sí — plegada dentro del README en vez de un archivo separado, siguiendo la propia plantilla de README de la guía (que ya incluye instalación como sección) | ✅ Hecho — sección "Instalación" y "Cómo correr el proyecto" de `README.md` |
| 6 | CONTRIBUTING.md | Alta | Sí, tal cual | ✅ Hecho — `CONTRIBUTING.md` |
| 7 | Glosario de términos del negocio | Alta | Sí, adaptado al dominio del widget (conversación, historial, shadow root, locale...) en vez de un dominio de logística/inventario | ✅ Hecho — `docs/GLOSARIO.md` |
| 8 | Flujos de negocio end-to-end | Alta | Sí, adaptado a los 3 flujos reales del widget (enviar texto, enviar imagen, gestionar historial) | ✅ Hecho — `docs/FLUJOS_DE_NEGOCIO.md` |
| 9 | Architecture Decision Records (ADRs) | Media | Sí — el proyecto ya tomó varias decisiones arquitecturales difíciles de revertir durante su hardening | ✅ Hecho — `docs/adr/0001` a `0006` |
| 10 | Documentación de testing | Media | Sí, tal cual | ✅ Hecho — `docs/TESTING.md` |
| 11 | Runbooks de operación y deployment | Media | **Parcial** — no hay despliegue a producción todavía (el widget sigue en fase de prototipo/arnés standalone, sin script distribuible ni hosting real), así que no existen protocolos de incidente de producción que documentar de forma honesta todavía | ⏸️ Diferido — se retomará cuando exista un despliegue real; mientras tanto, el troubleshooting básico vive en `README.md` |
| 12 | Guía de onboarding para nuevos desarrolladores | Media | Sí, pero sin archivo propio — el contenido de onboarding (cómo instalar, cómo contribuir, dónde está cada cosa) ya está cubierto entre `README.md` y `CONTRIBUTING.md`, que es justamente lo que la guía sugiere cuando ambos documentos ya son sólidos | ✅ Cubierto — `README.md` + `CONTRIBUTING.md` |
| 13 | CHANGELOG.md | Media | Sí, tal cual — con backfill del historial real de las 4 fases de hardening | ✅ Hecho — `CHANGELOG.md` |
| 14 | Documentación de seguridad y autenticación | Media | Sí, adaptado — el widget no tiene modelo de autenticación propio (es la ausencia deliberada, no un vacío), así que el documento se centra en esa ausencia, los riesgos conocidos del lado de n8n, y los secretos reales de configuración | ✅ Hecho, adaptado — `docs/SEGURIDAD.md` |
| 15 | Definición de entornos (dev/staging/prod) | Media | Sí — la estructura de `.env.*` ya existe desde el hardening del proyecto; staging/producción aún no tienen credenciales reales | ✅ Hecho — `docs/ENTORNOS.md` |
| 16 | Guía de observabilidad y monitoreo | Baja | **No** — se decidió explícitamente no integrar telemetría de errores (Sentry o similar) por no tener cuenta/DSN disponible; no hay nada que documentar todavía | ❌ No aplica todavía — revisar si el equipo integra un servicio de telemetría en el futuro |
| 17 | Política de versionado semántico (SemVer) | Baja | Sí, ligero — el proyecto adoptó SemVer desde esta versión (`package.json` en `0.1.0`, `CHANGELOG.md` en formato Keep a Changelog) | ✅ Cubierto — ver encabezado de `CHANGELOG.md` |
| 18 | Notas de migración entre versiones mayores | Baja | **No todavía** — no ha habido ningún cambio incompatible (versión mayor) que requiera notas de migración; el único versionado real hoy es el de esquema de `localStorage` (ver ADR-0006) | ❌ No aplica todavía — crear cuando exista la primera migración real |
| 19 | Storybook o catálogo de componentes UI | Baja | **No implementado** — no hay Storybook configurado en el proyecto | ❌ No aplica todavía — considerar si el número de componentes/variantes visuales crece lo suficiente para justificarlo |
| 20 | Compliance y normativas aplicables | Baja | **No identificado** — el widget no maneja datos que activen normativas específicas conocidas (no es un sistema financiero, de salud, ni recolecta PII estructurada); el único punto relevante (aviso de privacidad sobre el historial local) ya está resuelto como parte del producto, no como documento de compliance aparte | ❌ No aplica — reevaluar si el negocio identifica una normativa específica (ej. protección de datos) que aplique |

## Resumen

- **13 de 20 puntos** están completos (algunos adaptados al contexto de un widget frontend sin backend propio).
- **2 de 20** están cubiertos dentro de otro documento en vez de tener archivo propio (onboarding, SemVer) — no son huecos, son decisiones deliberadas de no duplicar contenido.
- **1 de 20** está parcialmente diferido (runbooks) porque documentar un despliegue que no existe todavía sería inventar contenido ficticio, en contra del principio de "verificable" de esta misma guía.
- **4 de 20** no aplican hoy (observabilidad, notas de migración, Storybook, compliance) — cada uno con la razón específica de por qué, no omitidos por descuido.

## Cómo mantener esta checklist actualizada

Cada vez que se complete o se retome uno de los puntos diferidos/no aplicables de arriba, actualizar su fila en esta tabla en el mismo cambio (mismo PR) que introduce ese documento — igual que cualquier otro cambio de comportamiento visible, según `CONTRIBUTING.md`.
