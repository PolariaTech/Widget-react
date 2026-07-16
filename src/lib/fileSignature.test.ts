import { describe, expect, it } from 'vitest';
import { sniffImageMimeType } from './fileSignature';

describe('sniffImageMimeType', () => {
  it('identifica JPEG por sus magic bytes', () => {
    const bytes = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x00]);
    expect(sniffImageMimeType(bytes)).toBe('image/jpeg');
  });

  it('identifica PNG por sus magic bytes', () => {
    const bytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    expect(sniffImageMimeType(bytes)).toBe('image/png');
  });

  it('identifica WebP por sus magic bytes (RIFF....WEBP)', () => {
    const bytes = new Uint8Array([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]);
    expect(sniffImageMimeType(bytes)).toBe('image/webp');
  });

  it('devuelve null para un PDF renombrado a .jpg (magic bytes no coinciden)', () => {
    const pdfBytes = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
    expect(sniffImageMimeType(pdfBytes)).toBeNull();
  });

  it('devuelve null para un arreglo vacío', () => {
    expect(sniffImageMimeType(new Uint8Array([]))).toBeNull();
  });

  it('devuelve null si los bytes son insuficientes para el formato', () => {
    const truncatedPng = new Uint8Array([0x89, 0x50, 0x4e]);
    expect(sniffImageMimeType(truncatedPng)).toBeNull();
  });
});
