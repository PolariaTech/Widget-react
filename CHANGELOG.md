# Changelog — Mateo Support Widget

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) | Versionado: [Semantic Versioning](https://semver.org/lang/es/)

## [Unreleased]

## [0.2.0] — 2026-07-16

Canal web operativo. El widget quedó embebido y **validado end-to-end en Polaria WMS (Bodega de Frío V2)** junto con el equipo host: identificación del usuario autenticado, creación de sesión, respuesta del RAG y manejo de errores de red/token. Cierra POL-72 (widget productivizado + auth real por visitante) y POL-73 (integración y validación), con POL-71 (guard JWT en n8n) ya desplegado — y con ello la épica POL-56 (widget de chat embebible).

### Added

- Build embebible (`npm run build:lib`): IIFE `dist/assets/mateo-widget.js` + ES; API `initMateoWidget` / `window.MateoWidget` (`src/embed.tsx`).
- Sync remoto de conversaciones (`RemoteConversationRepository`) con fallback `LocalStorageRepository`; docs `EMBED-POLARIA.md` + `vercel.json`.
- Se agregó un token manager en memoria (`src/lib/authToken.ts`) para el JWT de sesión del visitante: nunca se persiste en `localStorage`, se refresca proactivamente ~30s antes de expirar y reactivamente ante un 401 del webhook de n8n. Si el refresh falla porque la sesión subyacente ya no es válida, el manager deja de servir el último token conocido y expone el fallo (excepción/`onAuthError`) en vez de reintentar indefinidamente — queda como punto de enganche para una futura UI de re-login.
- Se agregó el header `Authorization: Bearer <jwt>` a cada llamada al webhook de n8n.

### Changed

- `onAuthError` cierra el modal del chat y muestra i18n `webhookAuthError`; POL-72 **done**, POL-73 host-side, POL-71 n8n-side (`docs/SEGURIDAD.md`).
- `docs/INTEGRACIONES.md` documenta el payload plano + Bearer (sin envelope WhatsApp obsoleto).
- El payload saliente hacia n8n dejó de imitar la envoltura del webhook de WhatsApp Business (`entry[].changes[].value.messages[]`) y ahora es un body plano `{ message_text, message_type }`.
- Se eliminó `USER_PHONE`, el identificador de remitente fijo y compartido por todos los visitantes del widget — la identidad ahora viaja en el JWT, no en el body del mensaje.
- Cuando el usuario adjunta una imagen junto con texto, ahora se envían dos mensajes secuenciales a n8n (imagen, luego texto) en vez de uno combinado, porque el nuevo body plano no tiene un campo de caption aparte; cada uno genera su propia respuesta de Mateo.
- Se removió el arnés de pruebas standalone (`App.tsx`/`index.html`): ya no hay fondo oscuro ni texto de demo — `npm run dev` muestra solo el botón flotante, tal como se vería embebido en un sitio host.
- El fondo del botón flotante (`ChatButton`) pasó de un degradado translúcido (dependía del fondo oscuro de la página del arnés para verse bien) a un fondo propio opaco — el botón ya no depende del color de fondo de la página donde se embeba.

### Fixed

- Se agregó `cursor-pointer` a todos los botones del widget (Tailwind resetea el cursor de `<button>` a `default` en el preflight).

### Security

- El widget ya no tiene ningún identificador hardcodeado de visitante; la identidad viaja en el JWT. La cadena de protección quedó completa: n8n valida el JWT (POL-71, desplegado) y Polaria WMS / Bodega de Frío V2 expone el endpoint emisor de tokens (POL-73, integrado y validado) — ver `docs/SEGURIDAD.md`.

## [0.1.0] — 2026-07-12

Primera versión endurecida del widget tras una auditoría técnica de 6 agentes en paralelo (documento interno, no versionado en este repositorio), ejecutada en 4 fases más un apéndice de hallazgos adicionales. El widget pasa de "prototipo funcional" a "prototipo con los bloqueantes de producción resueltos" (quedan pendientes puntos fuera del alcance de este repositorio — ver `docs/SEGURIDAD.md` y `docs/ENTORNOS.md`).

### Added

- Se agregó soporte de idioma español/inglés con detección automática por idioma del navegador (sin selector manual).
- Se agregó la posibilidad de eliminar una conversación individual o borrar todo el historial, con confirmación previa.
- Se agregó un aviso visible de que el historial se guarda únicamente en el navegador del visitante.
- Se agregó un límite de 2000 caracteres en el campo de mensaje.
- Se agregó confirmación antes de reemplazar una imagen ya adjunta por otra.
- Se agregó un aviso claro cuando el visitante está sin conexión a internet, en vez de dejar el mensaje esperando indefinidamente.
- Se agregó un indicador visual ("mensaje nuevo") en el botón flotante cuando llega una respuesta mientras el widget está minimizado.
- Se agregó recuperación automática ante errores inesperados de la interfaz, mostrando un botón de recargar en vez de dejar el widget completamente roto.
- Se agregaron pruebas automatizadas (33 tests) sobre los módulos de validación de imágenes, formato de fecha/hora y persistencia del historial.
- Se agregó documentación técnica completa del proyecto (`docs/`, este `CHANGELOG.md`, `CONTRIBUTING.md`, decisiones arquitecturales en `docs/adr/`).

### Changed

- El widget ahora se embebe dentro de un shadow root, para poder incrustarse en `polaria.tech` sin que sus estilos interfieran con los del sitio ni al revés.
- El historial de conversaciones ahora se sincroniza automáticamente si el widget está abierto en varias pestañas del navegador a la vez.
- Los mensajes de error (fallas de conexión, de subida de imagen) ahora se distinguen visualmente de las respuestas reales de Mateo — ya no se ven como si Mateo las hubiera escrito.
- El foco del teclado ahora se conserva y se restaura correctamente al abrir/cerrar el historial y al ver una imagen ampliada, y queda atrapado dentro del visor de imagen mientras está abierto.
- El indicador de "escribiendo…" y el área de mensajes ahora son anunciados correctamente por lectores de pantalla.
- Todos los botones e íconos del widget ahora muestran un indicador visible de foco al navegar con teclado.
- El contraste de las horas de los mensajes y las fechas del historial se subió para cumplir el estándar de accesibilidad WCAG AA.
- La URL del webhook de n8n y las credenciales de Cloudinary ahora se configuran por variables de entorno en vez de estar fijas en el código, preparando el proyecto para tener configuraciones distintas en desarrollo/staging/producción.
- El título de una conversación que empieza con una imagen ahora usa el texto que la acompaña (si lo hay) en vez de mostrar siempre "Imagen".
- Presionar Escape ahora cierra el historial abierto o minimiza el chat (antes solo cerraba el visor de imagen ampliada).
- El modal del chat ya no se sale de la pantalla en dispositivos con menos de 344px de ancho.
- SweetAlert2 (la librería de diálogos de alerta) ahora se carga solo cuando realmente se necesita, reduciendo el peso inicial del widget en ~22KB.

### Fixed

- Se corrigió un error crítico que dejaba el botón de enviar bloqueado permanentemente si el navegador no soportaba `crypto.randomUUID()` (por ejemplo, en contextos sin HTTPS).
- Se corrigió que una imagen con subida fallida quedaba guardada en el navegador en un formato pesado (base64) para siempre, lo que podía agotar el espacio de almacenamiento y hacer que dejaran de guardarse conversaciones nuevas sin ningún aviso.
- Se corrigió que un solo registro corrupto en el historial guardado borraba **todo** el historial en vez de solo ese registro.
- Se corrigió que los errores de conexión con el servidor se mostraban en el chat como si fueran una respuesta real de Mateo.
- Se corrigió que escribir un mensaje nuevo mientras se esperaba la respuesta anterior podía perder el texto sin enviarlo ni avisar.
- Se corrigió que cambiar de conversación en el historial no limpiaba la imagen adjunta ni el borrador de texto pendiente, pudiendo enviarse por error a la conversación equivocada.
- Se corrigió que mantener presionada la tecla Enter podía crear dos conversaciones distintas para un mismo mensaje.
- Se corrigió que las imágenes enviadas y las miniaturas adjuntas no se podían abrir sin usar el mouse.
- Se corrigió la respuesta de Cloudinary sin validar que la URL de la imagen fuera válida antes de usarla.
- Se corrigió que una respuesta inesperada del webhook de n8n (con una forma de datos no reconocida) mostraba el contenido interno crudo en el chat en vez de un mensaje de error legible.

### Security

- Se documentó (sin resolver en este repositorio, requiere coordinación con el equipo de n8n) que el webhook de n8n no tiene autenticación y que el identificador de remitente es un valor fijo compartido por todos los visitantes web — ver `docs/SEGURIDAD.md`.
- Se validó que la URL de imagen que devuelve Cloudinary es una URL bien formada antes de usarla, en vez de solo verificar que no esté vacía.

---

**Nota sobre este primer registro:** las entradas de arriba consolidan el trabajo de varias sesiones de hardening (Fases 0 a 3 del informe de auditoría, más un apéndice de hallazgos adicionales) que ocurrieron antes de que este `CHANGELOG.md` existiera. A partir de esta versión, cada cambio visible para el usuario se documenta aquí en el mismo cambio que lo origina, no de forma retroactiva.
