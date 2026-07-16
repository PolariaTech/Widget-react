# Testing — Mateo Support Widget

> Audiencia: cualquiera que vaya a escribir un test nuevo o interpretar por qué falló uno existente.

## Framework y configuración

**Vitest 4.1.10** con entorno **happy-dom 20.10.6** (simulador de DOM ligero, más rápido que jsdom). Se eligió Vitest porque comparte la configuración de Vite del propio proyecto (`vite.config.ts`, sección `test`) sin necesitar un segundo pipeline de build/transform como requeriría Jest.

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react(), tailwindcss()],
  test: {
    environment: 'happy-dom',
  },
})
```

## Cómo ejecutar los tests

```bash
npm run test
```

Resultado esperado:

```
 Test Files  4 passed (4)
      Tests  33 passed (33)
```

en menos de 2 segundos. Si un test falla, Vitest imprime el `expect` que no coincidió con valores esperado/recibido — no hace falta ningún flag adicional para ver el detalle.

Para correr un solo archivo de test (útil mientras trabajas en un módulo específico):

```bash
npx vitest run src/lib/storage.test.ts
```

## Estructura y convención de nombres

Los tests viven **junto al archivo que testean**, con el sufijo `.test.ts`:

```
src/lib/
├── cloudinary.ts
├── cloudinary.test.ts
├── fileSignature.ts
├── fileSignature.test.ts
├── format.ts
├── format.test.ts
├── storage.ts
└── storage.test.ts
```

No hay tests de integración ni e2e todavía — solo unitarios sobre los módulos puros de `src/lib/` (ver más abajo por qué esos y no otros).

## Qué cubre cada tipo de test hoy

| Alcance | Qué se testea | Ejemplo |
|---|---|---|
| Unitario (único tipo existente) | Funciones puras de `lib/`, sin dependencias de red ni de React | `sniffImageMimeType()` con distintos magic bytes |
| Integración | **No existe todavía** — requeriría mockear `fetch` hacia n8n/Cloudinary de forma más elaborada | — |
| E2E / componentes React | **No existe todavía** — la verificación de UI se hace manualmente en navegador (Claude in Chrome) en cada cambio, no está automatizada | — |

**Por qué solo `lib/` tiene tests:** son funciones puras o casi-puras (no importan React), fáciles de testear sin renderizar nada — el mayor retorno de inversión con el menor esfuerzo. Los componentes y hooks (`useChat`, `useConversations`) no tienen tests automatizados; se verifican manualmente en navegador real después de cada cambio (ver `CONTRIBUTING.md` → Definition of Done).

## Casos críticos que siempre deben pasar

Estos tests son guardianes de bugs reales que ya ocurrieron una vez — si alguno falla, es una señal de que ese bug podría estar reapareciendo, no un test menor a ignorar:

| Test | Qué protege |
|---|---|
| `storage.test.ts` → "descarta solo los registros corruptos, no todo el historial" | Regresión del bug de Fase 0: un solo registro corrupto en `localStorage` borraba **todo** el historial (`.every()` en vez de `.filter()`) |
| `storage.test.ts` → "descarta el historial completo si su versión de esquema es más nueva" | El envelope de versión (ADR-0006) descarta con seguridad en vez de interpretar mal datos de un esquema futuro |
| `storage.test.ts` → "sigue leyendo el formato sin envelope de antes de la versión de esquema" | Compatibilidad hacia atrás — usuarios con historial guardado antes de ADR-0006 no pierden sus datos |
| `cloudinary.test.ts` → validación de tamaño y tipo | Es la primera barrera antes de intentar subir un archivo — si falla, se podría intentar subir un archivo inválido |

## Cómo escribir un test nuevo

Patrón AAA (Arrange, Act, Assert), nombre descriptivo del **comportamiento**, no de la implementación:

```ts
// ✅ describe el comportamiento
it('descarta solo los registros corruptos, no todo el historial (regresión del bug de Fase 0)', () => {
  const valid: Conversation = createConversation();
  const corrupt = { id: 'corrupt', title: null }; // falta createdAt/updatedAt/messages
  localStorage.setItem(CONVERSATIONS_STORAGE_KEY, JSON.stringify([valid, corrupt]));
  const result = loadConversations();
  expect(result).toEqual([valid]);
});
```

```ts
// ❌ describe la implementación, no el comportamiento
it('llama a isConversation con cada elemento del array', () => { ... });
```

**Importante — tests agnósticos al idioma:** el entorno de test (`happy-dom`) puede resolver `navigator.language` distinto al navegador real de quien corre los tests. Todos los strings de usuario pasan por `t()` (ver `docs/adr/0002-i18n-propio-sin-libreria.md`) — los tests que comparan un mensaje de error deben construir el valor esperado con `t()` también, nunca con el texto literal en español hardcodeado:

```ts
// ✅ agnóstico al idioma
expect(result.error).toBe(t('cloudinaryTypeNotAllowed', { allowedTypes: '...', mimeType: 'image/gif' }));

// ❌ falla si el entorno de test resuelve inglés
expect(result.error).toContain('Formato de imagen no permitido');
```

**Mocks de `localStorage`:** para simular un fallo de escritura (ej. cuota excedida), usar `vi.spyOn` sobre `globalThis.localStorage` directamente — mockear la instancia devuelta por `Storage.prototype` no funciona con la implementación de happy-dom:

```ts
vi.spyOn(globalThis.localStorage, 'setItem').mockImplementation(() => {
  throw new DOMException('QuotaExceededError');
});
```

## Cobertura

No hay un umbral de cobertura configurado todavía (`vitest --coverage` no está en el script `test`). Dado que solo `lib/` tiene tests, la cobertura real de todo `src/` es baja — es un trade-off consciente (ver la tabla de arriba), no un objetivo de 100% de cobertura de proyecto.

## Errores comunes al escribir tests aquí

- Olvidar `localStorage.clear()` en un `beforeEach` — los tests de `storage.test.ts` comparten el mismo `localStorage` simulado entre ellos si no se limpia.
- Comparar contra texto literal en español (ver la sección de arriba sobre agnosticismo de idioma).
- Mockear `Storage.prototype` en vez de `globalThis.localStorage` (no tiene efecto con happy-dom, el test pasa por razones equivocadas o falla de forma confusa).
