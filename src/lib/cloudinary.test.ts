import { describe, expect, it } from 'vitest';
import { validateImage } from './cloudinary';
import { IMAGE_VALIDATION } from '../config';
import { t } from '../i18n';

describe('validateImage', () => {
  it('rechaza un mimeType no permitido', () => {
    const result = validateImage('data:image/gif;base64,AAAA', 'image/gif');
    expect(result.valid).toBe(false);
    expect(result.error).toBe(t('cloudinaryTypeNotAllowed', { allowedTypes: IMAGE_VALIDATION.ALLOWED_TYPES_DISPLAY, mimeType: 'image/gif' }));
  });

  it('acepta un mimeType permitido dentro del límite de tamaño', () => {
    const result = validateImage('data:image/png;base64,AAAA', 'image/png');
    expect(result.valid).toBe(true);
    expect(result.error).toBeNull();
  });

  it('rechaza una imagen que excede MAX_FILE_SIZE', () => {
    // sizeInBytes = ceil(dataUrl.length * 3 / 4); se arma un data URL cuyo
    // tamaño decodificado supere el máximo permitido.
    const oversizedLength = Math.ceil((IMAGE_VALIDATION.MAX_FILE_SIZE + 1024) * 4 / 3);
    const dataUrl = 'a'.repeat(oversizedLength);
    const result = validateImage(dataUrl, 'image/jpeg');
    expect(result.valid).toBe(false);
    const sizeMB = (Math.ceil((dataUrl.length * 3) / 4) / 1024 / 1024).toFixed(2);
    const maxMB = (IMAGE_VALIDATION.MAX_FILE_SIZE / 1024 / 1024).toFixed(1);
    expect(result.error).toBe(t('cloudinaryTooLarge', { sizeMB, maxMB }));
  });

  it('acepta una imagen justo debajo de MAX_FILE_SIZE', () => {
    const safeLength = Math.floor((IMAGE_VALIDATION.MAX_FILE_SIZE - 1024) * 4 / 3);
    const dataUrl = 'a'.repeat(safeLength);
    const result = validateImage(dataUrl, 'image/webp');
    expect(result.valid).toBe(true);
  });
});
