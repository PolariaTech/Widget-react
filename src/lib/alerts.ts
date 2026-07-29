/**
 * alerts.ts — Alertas con estética Polaria (PolariaFormModal), vía SweetAlert2.
 *
 * `buttonsStyling: false` delega el estilo a `swalTheme.css`.
 * SweetAlert2 monta en `document.body` (fuera del shadow root); ver main.tsx.
 */
import { IMAGE_VALIDATION } from '../config';
import { t } from '../i18n';

const THEME = {
  background: 'rgba(0, 229, 204, 0.08)',
  color: '#f8f8f6',
  iconColor: '#f5a524',
  backdrop: 'rgba(2, 6, 9, 0.8)',
  confirmButtonText: t('alertGotIt'),
  buttonsStyling: false,
  customClass: {
    popup: 'mateo-swal-popup',
    title: 'mateo-swal-title',
    htmlContainer: 'mateo-swal-text',
    actions: 'mateo-swal-actions',
    confirmButton: 'mateo-swal-confirm',
  },
} as const;

/** Muestra el mismo mensaje que antes daba `alert()` cuando el tipo de archivo no es válido. */
export async function showImageTypeError(fileType: string): Promise<void> {
  const { default: Swal } = await import('sweetalert2');
  void Swal.fire({
    ...THEME,
    icon: 'warning',
    title: t('alertImageTypeTitle'),
    text: t('alertImageTypeText', { fileType, allowedTypes: IMAGE_VALIDATION.ALLOWED_TYPES_DISPLAY }),
  });
}

/**
 * Se dispara cuando la extensión/MIME type declarados parecen válidos pero
 * el contenido real del archivo (sus magic bytes) no corresponde a ninguna
 * imagen soportada — p. ej. un PDF renombrado a `.jpg`.
 */
export async function showImageContentMismatchError(fileName: string): Promise<void> {
  const { default: Swal } = await import('sweetalert2');
  void Swal.fire({
    ...THEME,
    icon: 'warning',
    title: t('alertImageMismatchTitle'),
    text: t('alertImageMismatchText', { fileName, allowedTypes: IMAGE_VALIDATION.ALLOWED_TYPES_DISPLAY }),
  });
}

/** Se dispara cuando el archivo seleccionado excede IMAGE_VALIDATION.MAX_FILE_SIZE, antes de leerlo. */
export async function showImageTooLargeError(fileSizeBytes: number): Promise<void> {
  const sizeInMB = (fileSizeBytes / 1024 / 1024).toFixed(2);
  const maxSizeInMB = (IMAGE_VALIDATION.MAX_FILE_SIZE / 1024 / 1024).toFixed(1);
  const { default: Swal } = await import('sweetalert2');
  void Swal.fire({
    ...THEME,
    icon: 'warning',
    title: t('alertImageTooLargeTitle'),
    text: t('alertImageTooLargeText', { sizeMB: sizeInMB, maxMB: maxSizeInMB }),
  });
}

/** Se dispara la primera vez que falla el guardado del historial en localStorage (típicamente cuota excedida) — sin esto, el fallo solo queda en `console.warn` y el usuario cree que su historial se está guardando cuando no es así. */
export async function showStorageQuotaError(): Promise<void> {
  const { default: Swal } = await import('sweetalert2');
  void Swal.fire({
    ...THEME,
    icon: 'warning',
    title: t('alertQuotaTitle'),
    text: t('alertQuotaText'),
  });
}

/** Sesión / JWT inválido: mensaje i18n `webhookAuthError`. */
export async function showAuthSessionError(): Promise<void> {
  const { default: Swal } = await import('sweetalert2');
  void Swal.fire({
    ...THEME,
    icon: 'error',
    iconColor: '#f87171',
    title: t('webhookAuthError'),
    text: t('webhookAuthError'),
  });
}

/** Diálogo de confirmación para acciones destructivas (borrar conversación/historial). Devuelve `true` solo si el usuario confirma. */
export async function confirmDestructiveAction(title: string, text: string, confirmButtonText: string): Promise<boolean> {
  const { default: Swal } = await import('sweetalert2');
  const result = await Swal.fire({
    ...THEME,
    icon: 'warning',
    title,
    text,
    confirmButtonText,
    showCancelButton: true,
    cancelButtonText: t('alertCancel'),
    reverseButtons: true,
    focusCancel: true,
    customClass: {
      ...THEME.customClass,
      confirmButton: 'mateo-swal-confirm-danger',
      cancelButton: 'mateo-swal-cancel',
    },
  });
  return result.isConfirmed;
}
