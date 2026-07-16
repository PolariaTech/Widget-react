/**
 * i18n/index.ts — Traducciones del widget (español/inglés), detectadas una
 * sola vez a partir de `navigator.language` al cargar la página.
 *
 * Sin librería de i18n a propósito: son ~2 idiomas y un puñado fijo de
 * strings cortos sin pluralización real, y el idioma no cambia dentro de
 * una sesión (no hay selector de idioma en la UI) — una librería como
 * react-i18next agregaría ~40KB para resolver un problema que un objeto
 * plano + `String.replace` resuelven en unas líneas (mismo criterio que
 * llevó a lazy-cargar SweetAlert2 en vez de cargarlo siempre, ver alerts.ts).
 *
 * `t()` es una función de módulo, no un hook/Context: no hace falta
 * reactividad porque el idioma se resuelve una vez, antes de que React
 * empiece a renderizar, y se usa igual desde componentes que desde módulos
 * puros (alerts.ts, storage.ts, format.ts) que no tienen árbol de React.
 */
import es from './es';
import en from './en';

const dictionaries = { es, en };

export type Locale = keyof typeof dictionaries;

function detectLocale(): Locale {
  const lang = typeof navigator !== 'undefined' ? navigator.language : '';
  return lang.slice(0, 2).toLowerCase() === 'en' ? 'en' : 'es';
}

let locale: Locale = detectLocale();
let dict = dictionaries[locale];

/** Fija el locale (embed `initMateoWidget({ locale })`). Sin selector en UI. */
export function setLocale(next: Locale): void {
  locale = next;
  dict = dictionaries[locale];
}

/** Devuelve el texto traducido para `key`, interpolando `{{variable}}` con los valores de `vars`. */
export function t(key: keyof typeof es, vars?: Record<string, string | number>): string {
  let text: string = dict[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      text = text.replace(`{{${name}}}`, String(value));
    }
  }
  return text;
}

/** Tag de `Intl`/`toLocaleString` correspondiente al idioma detectado (fechas y horas). */
export function getLocaleTag(): string {
  return locale === 'en' ? 'en-US' : 'es-CO';
}
