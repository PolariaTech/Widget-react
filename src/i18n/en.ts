import type es from './es';

/**
 * en.ts — Diccionario en inglés. El tipo `Record<keyof typeof es, string>`
 * obliga a que exista una traducción para cada clave definida en es.ts; si
 * falta una, TypeScript no compila (ver nota en es.ts).
 */
const en: Record<keyof typeof es, string> = {
  chatButtonOpen: 'Open support chat',

  errorBoundaryMessage: 'Something went wrong with the support chat.',
  errorBoundaryReload: 'Reload',

  headerShowHistory: 'Show history',
  headerStatus: 'Online · polaria.tech',
  headerHistoryToggle: 'Conversation history',
  headerMinimize: 'Minimize',
  headerMinimizeAria: 'Minimize chat',
  headerFullscreen: 'Fullscreen',
  headerClose: 'Close chat',

  historyBack: 'Back to conversation',
  historyOverlayTitle: 'Conversation history',

  historyDeleteConvTitle: 'Delete conversation',
  historyDeleteConvText: '"{{title}}" will be permanently deleted.',
  historyDeleteConvConfirm: 'Delete',
  historyClearAllTitle: 'Clear all history',
  historyClearAllText: 'All your conversations saved in this browser will be permanently deleted.',
  historyClearAllConfirm: 'Clear all',
  historyNewConversation: 'New conversation',
  historyEmptyState: 'No previous conversations',
  historyDefaultTitle: 'New conversation',
  historyDeleteItemAria: 'Delete conversation "{{title}}"',
  historyClearAllButton: 'Clear all history',
  historyPrivacyNotice: 'Your conversations are only saved in this browser.',

  historySidebarHide: 'Hide history',
  historySidebarTitle: 'History',

  lightboxAlt: 'Enlarged image',
  lightboxClose: 'Close image',

  previewAlt: 'Preview of attached image',
  removeImageAria: 'Remove image',
  attachImageAria: 'Attach image',
  messagePlaceholder: 'Type your message...',
  sendMessageAria: 'Send message',

  sentImageAlt: 'Sent image',

  greeting: "Hi, I'm Mateo. How can I help you today?",

  typingSrText: 'Mateo is typing…',

  imageSendFailed: 'The image could not be sent.',
  imageProcessError: 'Error processing the image: {{message}}',

  alertGotIt: 'Got it',
  alertImageTypeTitle: 'Format not allowed',
  alertImageTypeText: 'File type not allowed: {{fileType}}. Accepted: {{allowedTypes}}',
  alertImageMismatchTitle: 'The file is not a valid image',
  alertImageMismatchText: '"{{fileName}}" does not match a real JPG, PNG, or WebP — it may be renamed or corrupted. Accepted: {{allowedTypes}}',
  alertImageTooLargeTitle: 'Image too large',
  alertImageTooLargeText: 'The file is {{sizeMB}}MB. Maximum allowed size: {{maxMB}}MB.',
  alertQuotaTitle: 'History could not be saved',
  alertQuotaText: 'The browser reached its local storage limit. Your current conversation still works, but history may stop saving from now on.',
  alertCancel: 'Cancel',

  requestTimeout: 'The request took too long and was cancelled. Please try again.',
  cloudinaryTypeNotAllowed: 'Image format not allowed. Accepted: {{allowedTypes}}. Received: {{mimeType}}',
  cloudinaryTooLarge: 'Image too large ({{sizeMB}}MB). Maximum allowed size: {{maxMB}}MB',
  cloudinaryInvalidImage: 'Invalid image',
  cloudinaryUploadError: 'Cloudinary responded with error {{status}}: {{body}}',
  cloudinaryNoSecureUrl: "Cloudinary's response does not contain secure_url",
  cloudinaryUploadFailed: 'Could not upload the image to Cloudinary: {{message}}',

  storageImageTitle: 'Image',

  webhookConnectionError: 'Error connecting to the server.',
  webhookUnexpectedReply: 'I received a reply in an unexpected format.',

  webhookAuthError: 'We could not verify your session. Please try again in a few seconds.',

  messageAriaLabel: 'Message',
  confirmReplaceImageTitle: 'Replace attached image',
  confirmReplaceImageText: 'You already have an image ready to send. Selecting another one will discard the current one.',
  confirmReplaceImageConfirm: 'Replace',

  errorReplyLabel: 'Could not get a reply',

  offlineError: "It looks like you're offline. Check your connection and try again.",
};

export default en;
