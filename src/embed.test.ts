import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetTokenManagerForTests,
  configureTokenFetcher,
} from './lib/authToken';
import { initMateoWidget, unmountMateoWidget } from './embed';

describe('initMateoWidget — POL-137 identificación segura', () => {
  let container: HTMLElement;

  beforeEach(() => {
    __resetTokenManagerForTests();
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    unmountMateoWidget();
    __resetTokenManagerForTests();
    container.remove();
    vi.restoreAllMocks();
  });

  it('lanza error si no hay tokenFetcher ni configureTokenFetcher previo', () => {
    expect(() => initMateoWidget({ container })).toThrow(
      /tokenFetcher|configureTokenFetcher/,
    );
  });

  it('monta correctamente si antes se llamó configureTokenFetcher', () => {
    configureTokenFetcher(async () => ({ token: 'jwt-test', expiresIn: 300 }));

    const handle = initMateoWidget({ container });

    expect(handle).toMatchObject({
      unmount: expect.any(Function),
      close: expect.any(Function),
    });
    expect(container.shadowRoot).toBeTruthy();
  });

  it('monta correctamente si se pasa tokenFetcher en opciones', () => {
    const handle = initMateoWidget({
      container,
      tokenFetcher: async () => ({ token: 'jwt-options', expiresIn: 300 }),
    });

    expect(handle).toMatchObject({
      unmount: expect.any(Function),
      close: expect.any(Function),
    });
    expect(container.shadowRoot).toBeTruthy();
  });
});
