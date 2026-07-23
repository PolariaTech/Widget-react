import { describe, expect, it } from 'vitest';
import { parseInline, parseRichContent } from './parseRichContent';

describe('parseInline', () => {
  it('aplica formato estilo WhatsApp: *negrita*, _cursiva_, ~tachado~, `mono`', () => {
    expect(parseInline('Hola *mundo* y _más_ ~viejo~ con `SKU`')).toEqual([
      { type: 'text', text: 'Hola ' },
      { type: 'bold', children: [{ type: 'text', text: 'mundo' }] },
      { type: 'text', text: ' y ' },
      { type: 'italic', children: [{ type: 'text', text: 'más' }] },
      { type: 'text', text: ' ' },
      { type: 'strike', children: [{ type: 'text', text: 'viejo' }] },
      { type: 'text', text: ' con ' },
      { type: 'code', text: 'SKU' },
    ]);
  });

  it('acepta **negrita** además de *negrita*', () => {
    expect(parseInline('di **hola** ya')).toEqual([
      { type: 'text', text: 'di ' },
      { type: 'bold', children: [{ type: 'text', text: 'hola' }] },
      { type: 'text', text: ' ya' },
    ]);
  });

  it('permite anidar *_negrita cursiva_*', () => {
    expect(parseInline('*_combo_*')).toEqual([
      {
        type: 'bold',
        children: [{ type: 'italic', children: [{ type: 'text', text: 'combo' }] }],
      },
    ]);
  });
});

describe('parseRichContent', () => {
  it('devuelve un párrafo para texto simple', () => {
    const blocks = parseRichContent('Hola, soy Mateo.');
    expect(blocks).toEqual([
      { type: 'paragraph', children: [{ type: 'text', text: 'Hola, soy Mateo.' }] },
    ]);
  });

  it('parsea tablas GFM al estilo Polaria', () => {
    const blocks = parseRichContent(`
Aquí tienes el resumen:

| Código | Estado |
|--------|--------|
| ORD-1  | Abierto |
| ORD-2  | Cerrado |
`);
    expect(blocks).toHaveLength(2);
    expect(blocks[0]?.type).toBe('paragraph');
    expect(blocks[1]).toEqual({
      type: 'table',
      headers: ['Código', 'Estado'],
      rows: [
        ['ORD-1', 'Abierto'],
        ['ORD-2', 'Cerrado'],
      ],
    });
  });

  it('parsea tablas sin pipes externos ni separador (como las manda Mateo)', () => {
    const blocks = parseRichContent(`
Va. Aquí tienes la tabla:

Nombre archivo | Fecha | Módulo | Descripción breve
imagenerrorlogin.png | 2026-07-23 | Auth / Login | Pantalla de login
imagenpagofallo.jpg | 2026-07-23 | Pagos | Error al pagar

Si quieres que la adapte, dime.
`);
    const table = blocks.find((b) => b.type === 'table');
    expect(table).toEqual({
      type: 'table',
      headers: ['Nombre archivo', 'Fecha', 'Módulo', 'Descripción breve'],
      rows: [
        ['imagenerrorlogin.png', '2026-07-23', 'Auth / Login', 'Pantalla de login'],
        ['imagenpagofallo.jpg', '2026-07-23', 'Pagos', 'Error al pagar'],
      ],
    });
  });

  it('parsea pasos numerados consecutivos como bloque interactivo', () => {
    const blocks = parseRichContent(`
Sigue estos pasos:

1. Abre Configuración
Entra al menú superior derecho.
2. Elige Usuarios
3. Guarda los cambios
`);
    const steps = blocks.find((b) => b.type === 'steps');
    expect(steps).toEqual({
      type: 'steps',
      items: [
        { title: 'Abre Configuración', detail: 'Entra al menú superior derecho.' },
        { title: 'Elige Usuarios', detail: undefined },
        { title: 'Guarda los cambios', detail: undefined },
      ],
    });
  });

  it('no trata un solo número como pasos', () => {
    const blocks = parseRichContent('1. Solo esto');
    expect(blocks[0]?.type).toBe('paragraph');
  });

  it('parsea listas, callouts y headings', () => {
    const blocks = parseRichContent(`
## Inventario

- Revisar stock
- Ajustar ubicaciones

Nota: Verifica el almacén activo.
Importante: No borres movimientos.
Tip: Usa el filtro por SKU.
`);
    expect(blocks.map((b) => b.type)).toEqual([
      'heading',
      'list',
      'callout',
      'callout',
      'callout',
    ]);
    expect(blocks[2]).toMatchObject({ type: 'callout', tone: 'info' });
    expect(blocks[3]).toMatchObject({ type: 'callout', tone: 'warning' });
    expect(blocks[4]).toMatchObject({ type: 'callout', tone: 'tip' });
  });

  it('acepta Paso 1 / Paso 2', () => {
    const blocks = parseRichContent(`
Paso 1: Crear el pedido
Paso 2: Confirmar picking
`);
    expect(blocks[0]).toMatchObject({
      type: 'steps',
      items: [
        { title: 'Crear el pedido' },
        { title: 'Confirmar picking' },
      ],
    });
  });

  it('parsea citas > y bloques ```mono``` estilo WhatsApp', () => {
    const blocks = parseRichContent(`
> Esto es una cita

\`\`\`
codigo
\`\`\`
`);
    expect(blocks.map((b) => b.type)).toEqual(['quote', 'pre']);
    expect(blocks[1]).toEqual({ type: 'pre', text: 'codigo' });
  });
});
