# Changelog ÔÇö Mateo Support Widget

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) | Versionado: [Semantic Versioning](https://semver.org/lang/es/)

La versi├│n de **producto** Polaria WMS (web + API + BD + este widget) es **2.7.15**. Los n├║meros 0.1.0 / 0.2.0 de abajo son el historial interno previo del widget.

## [Unreleased]

### Fixed
- POL-245: imagen y texto se env├¡an como un solo mensaje de usuario y un solo POST a n8n (`image_caption`). El pie se muestra en la misma burbuja y se conserva en el historial.

## [2.7.5] ÔÇö 2026-09-17

Alineado con Polaria WMS 2.7.5.

## [2.4.9] ÔÇö 2026-09-03

Alineado con Polaria WMS 2.4.9.

## [2.4.3] ÔÇö 2026-08-29

Alineado con Polaria WMS 2.4.3.

### Added
- Enlaces del chat subrayados; el clic abre otra pesta├▒a.
- Nombre de PDF en ÔÇ£rutaÔÇØ como descarga cuando hay URL v├ílida.

### Changed
- El widget se cierra cuando caduca o se cierra la sesi├│n de Polaria (12 h).

## [0.2.0] ÔÇö 2026-07-16

Canal web operativo. El widget qued├│ embebido y **validado end-to-end en Polaria WMS (Bodega de Fr├¡o V2)** junto con el equipo host: identificaci├│n del usuario autenticado, creaci├│n de sesi├│n, respuesta del RAG y manejo de errores de red/token. Cierra POL-72 (widget productivizado + auth real por visitante) y POL-73 (integraci├│n y validaci├│n), con POL-71 (guard JWT en n8n) ya desplegado ÔÇö y con ello la ├®pica POL-56 (widget de chat embebible).

### Added

- Build embebible (`npm run build:lib`): IIFE `dist/assets/mateo-widget.js` + ES; API `initMateoWidget` / `window.MateoWidget` (`src/embed.tsx`).
- Sync remoto de conversaciones (`RemoteConversationRepository`) con fallback `LocalStorageRepository`; docs `EMBED-POLARIA.md` + `vercel.json`.
- Se agreg├│ un token manager en memoria (`src/lib/authToken.ts`) para el JWT de sesi├│n del visitante: nunca se persiste en `localStorage`, se refresca proactivamente ~30s antes de expirar y reactivamente ante un 401 del webhook de n8n. Si el refresh falla porque la sesi├│n subyacente ya no es v├ílida, el manager deja de servir el ├║ltimo token conocido y expone el fallo (excepci├│n/`onAuthError`) en vez de reintentar indefinidamente ÔÇö queda como punto de enganche para una futura UI de re-login.
- Se agreg├│ el header `Authorization: Bearer <jwt>` a cada llamada al webhook de n8n.

### Changed

- `onAuthError` cierra el modal del chat y muestra i18n `webhookAuthError`; POL-72 **done**, POL-73 host-side, POL-71 n8n-side (`docs/SEGURIDAD.md`).
- `docs/INTEGRACIONES.md` documenta el payload plano + Bearer (sin envelope WhatsApp obsoleto).
- El payload saliente hacia n8n dej├│ de imitar la envoltura del webhook de WhatsApp Business (`entry[].changes[].value.messages[]`) y ahora es un body plano `{ message_text, message_type }`.
- Se elimin├│ `USER_PHONE`, el identificador de remitente fijo y compartido por todos los visitantes del widget ÔÇö la identidad ahora viaja en el JWT, no en el body del mensaje.
- Cuando el usuario adjunta una imagen junto con texto, ahora se env├¡an dos mensajes secuenciales a n8n (imagen, luego texto) en vez de uno combinado, porque el nuevo body plano no tiene un campo de caption aparte; cada uno genera su propia respuesta de Mateo.
- Se removi├│ el arn├®s de pruebas standalone (`App.tsx`/`index.html`): ya no hay fondo oscuro ni texto de demo ÔÇö `npm run dev` muestra solo el bot├│n flotante, tal como se ver├¡a embebido en un sitio host.
- El fondo del bot├│n flotante (`ChatButton`) pas├│ de un degradado transl├║cido (depend├¡a del fondo oscuro de la p├ígina del arn├®s para verse bien) a un fondo propio opaco ÔÇö el bot├│n ya no depende del color de fondo de la p├ígina donde se embeba.

### Fixed

- Se agreg├│ `cursor-pointer` a todos los botones del widget (Tailwind resetea el cursor de `<button>` a `default` en el preflight).

### Security

- El widget ya no tiene ning├║n identificador hardcodeado de visitante; la identidad viaja en el JWT. La cadena de protecci├│n qued├│ completa: n8n valida el JWT (POL-71, desplegado) y Polaria WMS / Bodega de Fr├¡o V2 expone el endpoint emisor de tokens (POL-73, integrado y validado) ÔÇö ver `docs/SEGURIDAD.md`.

## [0.1.0] ÔÇö 2026-07-12

Primera versi├│n endurecida del widget tras una auditor├¡a t├®cnica de 6 agentes en paralelo (documento interno, no versionado en este repositorio), ejecutada en 4 fases m├ís un ap├®ndice de hallazgos adicionales. El widget pasa de "prototipo funcional" a "prototipo con los bloqueantes de producci├│n resueltos" (quedan pendientes puntos fuera del alcance de este repositorio ÔÇö ver `docs/SEGURIDAD.md` y `docs/ENTORNOS.md`).

### Added

- Se agreg├│ soporte de idioma espa├▒ol/ingl├®s con detecci├│n autom├ítica por idioma del navegador (sin selector manual).
- Se agreg├│ la posibilidad de eliminar una conversaci├│n individual o borrar todo el historial, con confirmaci├│n previa.
- Se agreg├│ un aviso visible de que el historial se guarda ├║nicamente en el navegador del visitante.
- Se agreg├│ un l├¡mite de 2000 caracteres en el campo de mensaje.
- Se agreg├│ confirmaci├│n antes de reemplazar una imagen ya adjunta por otra.
- Se agreg├│ un aviso claro cuando el visitante est├í sin conexi├│n a internet, en vez de dejar el mensaje esperando indefinidamente.
- Se agreg├│ un indicador visual ("mensaje nuevo") en el bot├│n flotante cuando llega una respuesta mientras el widget est├í minimizado.
- Se agreg├│ recuperaci├│n autom├ítica ante errores inesperados de la interfaz, mostrando un bot├│n de recargar en vez de dejar el widget completamente roto.
- Se agregaron pruebas automatizadas (33 tests) sobre los m├│dulos de validaci├│n de im├ígenes, formato de fecha/hora y persistencia del historial.
- Se agreg├│ documentaci├│n t├®cnica completa del proyecto (`docs/`, este `CHANGELOG.md`, `CONTRIBUTING.md`, decisiones arquitecturales en `docs/adr/`).

### Changed

- El widget ahora se embebe dentro de un shadow root, para poder incrustarse en `polaria.tech` sin que sus estilos interfieran con los del sitio ni al rev├®s.
- El historial de conversaciones ahora se sincroniza autom├íticamente si el widget est├í abierto en varias pesta├▒as del navegador a la vez.
- Los mensajes de error (fallas de conexi├│n, de subida de imagen) ahora se distinguen visualmente de las respuestas reales de Mateo ÔÇö ya no se ven como si Mateo las hubiera escrito.
- El foco del teclado ahora se conserva y se restaura correctamente al abrir/cerrar el historial y al ver una imagen ampliada, y queda atrapado dentro del visor de imagen mientras est├í abierto.
- El indicador de "escribiendoÔÇª" y el ├írea de mensajes ahora son anunciados correctamente por lectores de pantalla.
- Todos los botones e ├¡conos del widget ahora muestran un indicador visible de foco al navegar con teclado.
- El contraste de las horas de los mensajes y las fechas del historial se subi├│ para cumplir el est├índar de accesibilidad WCAG AA.
- La URL del webhook de n8n y las credenciales de Cloudinary ahora se configuran por variables de entorno en vez de estar fijas en el c├│digo, preparando el proyecto para tener configuraciones distintas en desarrollo/staging/producci├│n.
- El t├¡tulo de una conversaci├│n que empieza con una imagen ahora usa el texto que la acompa├▒a (si lo hay) en vez de mostrar siempre "Imagen".
- Presionar Escape ahora cierra el historial abierto o minimiza el chat (antes solo cerraba el visor de imagen ampliada).
- El modal del chat ya no se sale de la pantalla en dispositivos con menos de 344px de ancho.
- SweetAlert2 (la librer├¡a de di├ílogos de alerta) ahora se carga solo cuando realmente se necesita, reduciendo el peso inicial del widget en ~22KB.

### Fixed

- Se corrigi├│ un error cr├¡tico que dejaba el bot├│n de enviar bloqueado permanentemente si el navegador no soportaba `crypto.randomUUID()` (por ejemplo, en contextos sin HTTPS).
- Se corrigi├│ que una imagen con subida fallida quedaba guardada en el navegador en un formato pesado (base64) para siempre, lo que pod├¡a agotar el espacio de almacenamiento y hacer que dejaran de guardarse conversaciones nuevas sin ning├║n aviso.
- Se corrigi├│ que un solo registro corrupto en el historial guardado borraba **todo** el historial en vez de solo ese registro.
- Se corrigi├│ que los errores de conexi├│n con el servidor se mostraban en el chat como si fueran una respuesta real de Mateo.
- Se corrigi├│ que escribir un mensaje nuevo mientras se esperaba la respuesta anterior pod├¡a perder el texto sin enviarlo ni avisar.
- Se corrigi├│ que cambiar de conversaci├│n en el historial no limpiaba la imagen adjunta ni el borrador de texto pendiente, pudiendo enviarse por error a la conversaci├│n equivocada.
- Se corrigi├│ que mantener presionada la tecla Enter pod├¡a crear dos conversaciones distintas para un mismo mensaje.
- Se corrigi├│ que las im├ígenes enviadas y las miniaturas adjuntas no se pod├¡an abrir sin usar el mouse.
- Se corrigi├│ la respuesta de Cloudinary sin validar que la URL de la imagen fuera v├ílida antes de usarla.
- Se corrigi├│ que una respuesta inesperada del webhook de n8n (con una forma de datos no reconocida) mostraba el contenido interno crudo en el chat en vez de un mensaje de error legible.

### Security

- Se document├│ (sin resolver en este repositorio, requiere coordinaci├│n con el equipo de n8n) que el webhook de n8n no tiene autenticaci├│n y que el identificador de remitente es un valor fijo compartido por todos los visitantes web ÔÇö ver `docs/SEGURIDAD.md`.
- Se valid├│ que la URL de imagen que devuelve Cloudinary es una URL bien formada antes de usarla, en vez de solo verificar que no est├® vac├¡a.

---

**Nota sobre este primer registro:** las entradas de 0.1.0 consolidan el trabajo de varias sesiones de hardening (Fases 0 a 3 del informe de auditor├¡a, m├ís un ap├®ndice de hallazgos adicionales) que ocurrieron antes de que este `CHANGELOG.md` existiera. A partir de esa versi├│n, cada cambio visible para el usuario se documenta aqu├¡ en el mismo cambio que lo origina, no de forma retroactiva.
