import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

describe('product version 2.7.15', () => {
  it('alinea VERSION, package.json, README y CHANGELOG en UTF-8', () => {
    const root = resolve(__dirname, '..');
    const version = readFileSync(resolve(root, 'VERSION'), 'utf8').trim();
    const pkg = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
    const readme = readFileSync(resolve(root, 'README.md'), 'utf8');
    const changelog = readFileSync(resolve(root, 'CHANGELOG.md'), 'utf8');
    expect(version).toBe('2.7.15');
    expect(pkg.version).toBe('2.7.15');
    expect(readme).toContain('2.7.15');
    expect(changelog).toContain('2.7.15');
    expect(changelog.includes('\u0000')).toBe(false);
  });

  it('excluye tests del tsc de build (tsconfig.app)', () => {
    const root = resolve(__dirname, '..');
    const tsconfig = readFileSync(resolve(root, 'tsconfig.app.json'), 'utf8');
    expect(tsconfig).toContain('"src/**/*.test.ts"');
    expect(tsconfig).toContain('"src/**/*.test.tsx"');
    expect(tsconfig).toContain('"src/**/*.spec.ts"');
    expect(tsconfig).toContain('"src/**/*.spec.tsx"');
  });
});
