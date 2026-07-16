import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import widgetStyles from './index.css?inline'
import './swalTheme.css'
import App from './App.tsx'
import { ErrorBoundary } from './components/ErrorBoundary.tsx'

/**
 * El widget se monta dentro de un shadow root (no directamente en `#root`)
 * para no filtrar el preflight de Tailwind hacia el sitio anfitrión ni al
 * revés, requisito para poder embeberse en polaria.tech. El CSS del widget
 * se importa con `?inline` (string procesado por Tailwind, no un <link> que
 * Vite inyectaría en el <head> del documento) para poder colocarlo como
 * <style> dentro del propio shadow root.
 *
 * swalTheme.css se importa aparte, de forma normal (SIN `?inline`): SweetAlert2
 * monta sus popups siempre en `document.body`, nunca dentro de un shadow root
 * (ver la nota en ese archivo), así que su tema tiene que vivir en el <head>
 * del documento como cualquier CSS de Vite de costumbre.
 */
const host = document.getElementById('root')!
const shadowRoot = host.attachShadow({ mode: 'open' })

const styleEl = document.createElement('style')
styleEl.textContent = widgetStyles
shadowRoot.appendChild(styleEl)

const reactMount = document.createElement('div')
shadowRoot.appendChild(reactMount)

createRoot(reactMount).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
