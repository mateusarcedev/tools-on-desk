import { Component, ErrorInfo, ReactNode } from 'react';
import { TauriService } from '../../services/tauri';
import { Button } from './Button';
import { Icon } from './Icon';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Unhandled React Error:', error, errorInfo);

    TauriService.logFrontendError({
      severity: 'error',
      source: 'react_error_boundary',
      module: 'ui',
      operation: 'render_view',
      errorCode: 'REACT_RENDER_CRASH',
      userMessage: `Ocorreu um erro na renderização da interface: ${error.message || 'Falha inesperada'}`,
      technicalDetails: `${error.name}: ${error.message}`,
      sanitizedStack: errorInfo.componentStack || error.stack,
    }).catch((e) => console.warn('Failed to log React error:', e));
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            background: 'var(--bg)',
            color: 'var(--fg)',
            textAlign: 'center',
            gap: 16,
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: 'var(--pink-dim)',
              color: 'var(--pink)',
              display: 'grid',
              placeItems: 'center',
            }}
          >
            <Icon name="alert" size={28} />
          </div>

          <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>
            Algo inesperado aconteceu nesta tela
          </h2>

          <p style={{ fontSize: '13px', color: 'var(--fg-dim)', maxWidth: 460, margin: 0, lineHeight: 1.5 }}>
            O erro foi capturado e salvo na Central de Erros e Diagnósticos para auditoria.
            Você pode tentar recarregar a tela ou navegar para outro módulo.
          </p>

          {this.state.error && (
            <pre
              style={{
                fontFamily: 'var(--mono)',
                fontSize: '11px',
                background: 'var(--surface)',
                border: '1px solid var(--line)',
                borderRadius: 8,
                padding: '10px 14px',
                color: 'var(--pink)',
                maxWidth: 540,
                textAlign: 'left',
                overflowX: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {this.state.error.message}
            </pre>
          )}

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <Button variant="primary" onClick={this.handleReload}>
              Recarregar visualização
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
