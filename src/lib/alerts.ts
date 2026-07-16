/**
 * alerts.ts — Alertas con la estética de Mateo Support (fondo oscuro con
 * degradado, acento teal, tipografía Inter), reemplazando los `alert()`
 * nativos del navegador. Paleta tomada de paleta-colores-polaria.md.
 *
 * `buttonsStyling: false` delega todo el estilo del botón a `mateo-swal-confirm`
 * (definida en swalTheme.css) en vez de a los estilos inline por defecto de SweetAlert2.
 *
 * SweetAlert2 se monta siempre en `document.body` — su propio `getContainer()`
 * interno usa `document.body.querySelector(...)` sin importar el `target` que
 * se le pase, así que no puede vivir dentro del shadow root del widget (ver
 * main.tsx). Por eso su hoja de estilos (swalTheme.css) se importa aparte,
 * sin `?inline`, para que Vite la inyecte en el `<head>` del documento normal.
 */
import { IMAGE_VALIDATION } from '../config';
import { t } from '../i18n';

const THEME = {
  background: 'linear-gradient(159.676deg, rgba(4,14,20,0.97) 8.4861%, rgba(2,6,9,0.98) 91.514%)',
  color: '#f8f8f6',
  iconColor: '#00e5cc',
  backdrop: 'rgba(2,6,9,0.7)',
  confirmButtonText: t('alertGotIt'),
  buttonsStyling: false,
  customClass: {
    popup: 'mateo-swal-popup',
    title: 'mateo-swal-title',
    htmlContainer: 'mateo-swal-text',
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
    customClass: {
      ...THEME.customClass,
      cancelButton: 'mateo-swal-cancel',
    },
  });
  return result.isConfirmed;
}
