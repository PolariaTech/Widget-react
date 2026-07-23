/**
 * es.ts — Diccionario de textos en español (idioma por defecto del widget).
 * `en.ts` debe cubrir exactamente el mismo conjunto de claves (TypeScript lo
 * exige vía `Record<keyof typeof es, string>`), así que agregar un texto
 * nuevo acá y olvidarlo en inglés es un error de compilación, no un bug
 * silencioso en producción.
 */
const es = {
  // ChatButton.tsx
  chatButtonOpen: 'Abrir chat de soporte',

  // ErrorBoundary.tsx
  errorBoundaryMessage: 'Algo salió mal con el chat de soporte.',
  errorBoundaryReload: 'Recargar',

  // Header.tsx
  headerShowHistory: 'Mostrar historial',
  headerStatus: 'En línea · polaria.tech',
  headerHistoryToggle: 'Historial de conversaciones',
  headerMinimize: 'Minimizar',
  headerMinimizeAria: 'Minimizar chat',
  headerFullscreen: 'Pantalla completa',
  headerClose: 'Cerrar chat',

  // HistoryOverlay.tsx
  historyBack: 'Volver a la conversación',
  historyOverlayTitle: 'Historial de conversaciones',

  // HistoryPanel.tsx
  historyDeleteConvTitle: 'Eliminar conversación',
  historyDeleteConvText: 'Se eliminará "{{title}}" de forma permanente.',
  historyDeleteConvConfirm: 'Eliminar',
  historyClearAllTitle: 'Borrar todo el historial',
  historyClearAllText: 'Se eliminarán todas tus conversaciones guardadas en este navegador de forma permanente.',
  historyClearAllConfirm: 'Borrar todo',
  historyNewConversation: 'Nueva conversación',
  historyEmptyState: 'Sin conversaciones anteriores',
  historyDefaultTitle: 'Nueva conversación',
  historyDeleteItemAria: 'Eliminar conversación "{{title}}"',
  historyClearAllButton: 'Borrar todo el historial',
  historyPrivacyNotice: 'Tus conversaciones se guardan solo en este navegador.',

  // HistorySidebar.tsx
  historySidebarHide: 'Ocultar historial',
  historySidebarTitle: 'Historial',

  // ImageLightbox.tsx
  lightboxAlt: 'Imagen ampliada',
  lightboxClose: 'Cerrar imagen',

  // InputFooter.tsx
  previewAlt: 'Vista previa de la imagen adjunta',
  removeImageAria: 'Quitar imagen',
  attachImageAria: 'Adjuntar imagen',
  messagePlaceholder: 'Escribe tu mensaje...',
  sendMessageAria: 'Enviar mensaje',

  // MessageBubble.tsx
  sentImageAlt: 'Imagen enviada',

  // ChatSteps.tsx (pasos interactivos en respuestas de Mateo)
  stepsLabel: 'Pasos guiados',
  stepsProgressAria: 'Progreso: {{done}} de {{total}} pasos completados',
  stepsMarkDoneAria: 'Marcar paso {{n}} como hecho',
  stepsMarkPendingAria: 'Marcar paso {{n}} como pendiente',
  stepsNoDetail: 'Sin detalle adicional en este paso.',
  stepsAskButton: 'Preguntar sobre este paso',
  stepsAskPrompt: 'Explícame con más detalle este paso: {{step}}',

  // ChatTable.tsx
  tableLabel: 'Tabla',
  tableRowsCount: '{{count}} filas',
  tableRowCountOne: '1 fila',
  tableEmpty: 'Sin datos',

  // MessagesArea.tsx
  greeting: 'Hola, soy Mateo. ¿En qué te puedo ayudar hoy?',

  // TypingIndicator.tsx
  typingSrText: 'Mateo está escribiendo…',

  // useChat.ts
  imageSendFailed: 'No se pudo enviar la imagen.',
  imageProcessError: 'Error al procesar la imagen: {{message}}',

  // alerts.ts
  alertGotIt: 'Entendido',
  alertImageTypeTitle: 'Formato no permitido',
  alertImageTypeText: 'Tipo de archivo no permitido: {{fileType}}. Acepto: {{allowedTypes}}',
  alertImageMismatchTitle: 'El archivo no es una imagen válida',
  alertImageMismatchText: '"{{fileName}}" no coincide con un JPG, PNG o WebP real — puede estar renombrado o dañado. Acepto: {{allowedTypes}}',
  alertImageTooLargeTitle: 'Imagen demasiado grande',
  alertImageTooLargeText: 'El archivo pesa {{sizeMB}}MB. Tamaño máximo permitido: {{maxMB}}MB.',
  alertQuotaTitle: 'No se pudo guardar el historial',
  alertQuotaText: 'El navegador alcanzó su límite de almacenamiento local. Tu conversación actual sigue funcionando, pero el historial podría no guardarse a partir de ahora.',
  alertCancel: 'Cancelar',

  // cloudinary.ts
  requestTimeout: 'La solicitud tardó demasiado y fue cancelada. Intenta de nuevo.',
  cloudinaryTypeNotAllowed: 'Formato de imagen no permitido. Acepto: {{allowedTypes}}. Recibí: {{mimeType}}',
  cloudinaryTooLarge: 'Imagen demasiado grande ({{sizeMB}}MB). Tamaño máximo permitido: {{maxMB}}MB',
  cloudinaryInvalidImage: 'Imagen inválida',
  cloudinaryUploadError: 'Cloudinary respondió con error {{status}}: {{body}}',
  cloudinaryNoSecureUrl: 'Respuesta de Cloudinary no contiene secure_url',
  cloudinaryUploadFailed: 'No se pudo subir la imagen a Cloudinary: {{message}}',

  // storage.ts
  storageImageTitle: 'Imagen',

  // webhook.ts
  webhookConnectionError: 'Error al conectar con el servidor.',
  webhookUnexpectedReply: 'Recibí una respuesta con un formato inesperado.',

  // webhook.ts / authToken.ts (POL-72 — autenticación del canal web)
  webhookAuthError: 'No se pudo verificar tu sesión. Intenta de nuevo en unos segundos.',

  // InputFooter.tsx (Tanda 4/5 del apéndice)
  messageAriaLabel: 'Mensaje',
  confirmReplaceImageTitle: 'Reemplazar imagen adjunta',
  confirmReplaceImageText: 'Ya tienes una imagen lista para enviar. Seleccionar otra descartará la actual.',
  confirmReplaceImageConfirm: 'Reemplazar',

  // MessageBubble.tsx (distinguir errores de red de respuestas normales)
  errorReplyLabel: 'No se pudo obtener respuesta',

  // useChat.ts (chequeo de navigator.onLine)
  offlineError: 'Parece que no tienes conexión a internet. Revisa tu conexión e intenta de nuevo.',
} as const;

export default es;
