import { describe, expect, it } from 'vitest';
import { formatMessageTime } from './format';

describe('formatMessageTime', () => {
  it('devuelve cadena vacía para timestamp null', () => {
    expect(formatMessageTime(null)).toBe('');
  });

  it('devuelve cadena vacía para timestamp undefined', () => {
    expect(formatMessageTime(undefined)).toBe('');
  });

  it('devuelve cadena vacía para timestamp 0', () => {
    expect(formatMessageTime(0)).toBe('');
  });

  it('formatea un timestamp válido como hora corta', () => {
    const result = formatMessageTime(Date.now());
    expect(result).not.toBe('');
    expect(typeof result).toBe('string');
  });
});
