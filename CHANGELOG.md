# Changelog — Mateo Support Widget

Formato: [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/) | Versionado: [Semantic Versioning](https://semver.org/lang/es/)

La versión de **producto** Polaria WMS (web + API + BD + este widget) es **2.7.15**. Los números 0.1.0 / 0.2.0 de abajo son el historial interno previo del widget.

## [Unreleased]

### Fixed
- POL-245: imagen y texto se envían como un solo mensaje de usuario y un solo POST a n8n (`image_caption`). El pie se muestra en la misma burbuja y se conserva en el historial.

## [2.7.15] — 2026-09-25

Alineado con Polaria WMS 2.7.15. La sesión del host (y el cierre del widget) dura **1 mes**; el handoff SSO no cambia.

## [2.7.5] — 2026-09-17

Alineado con Polaria WMS 2.7.5.

## [2.4.9] — 2026-09-03

Alineado con Polaria WMS 2.4.9.

## [2.4.3] — 2026-08-29

Alineado con Polaria WMS 2.4.3.

### Added
- Enlaces del chat subrayados; el clic abre otra pestaña.
- Nombre de PDF en “ruta” como descarga cuando hay URL válida.

### Changed
- El widget se cierra cuando caduca o se cierra la sesión de Polaria (antes 12 h; desde 2.7.15: 1 mes).

## [0.2.0] — 2026-07-16

Canal web operativo. El widget quedó embebido y **validado end-to-end en Polaria WMS (Bodega de Frío V2)** junto con el equipo host: identificación del usuario autenticado, creación de sesión, respuesta del RAG y manejo de errores de red/token. Cierra POL-72 (widget productivizado + auth real por visitante) y POL-73 (integración y validación), con POL-71 (guard JWT en n8n) ya desplegado — y con ello la épica POL-56 (widget de chat embebible).
