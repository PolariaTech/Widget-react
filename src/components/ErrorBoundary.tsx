import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { t } from '../i18n';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/** Último fallback ante un error de render inesperado: sin esto, cualquier excepción en el árbol de React tumba el widget completo sin ningún mensaje. */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Mateo Support widget: error inesperado de render.', error, info.componentStack);
  }

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div
          className="fixed bottom-6 right-6 z-50 w-[280px] rounded-[18px] border border-[rgba(0,229,204,0.18)] shadow-2xl p-[20px] text-center"
          style={{ backgroundImage: 'linear-gradient(159.676deg, rgba(4,14,20,0.97) 8.4861%, rgba(2,6,9,0.98) 91.514%)' }}
        >
          <p className="text-[13px] text-[#f8f8f6] mb-[12px]">{t('errorBoundaryMessage')}</p>
          <button
            onClick={this.handleReload}
            className="bg-[rgba(0,229,204,0.15)] border border-[rgba(0,229,204,0.3)] rounded-[10px] px-[16px] py-[8px] text-[13px] text-[#00e5cc] hover:bg-[rgba(0,229,204,0.28)] transition-colors focus:outline-none focus:ring-2 focus:ring-[#00E5CC] focus:ring-offset-2 focus:ring-offset-transparent"
          >
            {t('errorBoundaryReload')}
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
