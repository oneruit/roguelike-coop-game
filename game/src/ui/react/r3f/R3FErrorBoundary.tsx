import { Component, type ErrorInfo, type ReactNode } from 'react';

export interface R3FErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Production ErrorBoundary isolating 3D R3F Canvas failures from the 2D UI.
 */
export class R3FErrorBoundary extends Component<R3FErrorBoundaryProps, State> {
  public override state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('[R3FErrorBoundary] 3D Canvas error caught:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  public override render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0b0e14',
            color: '#f87171',
            fontFamily: 'Montserrat, sans-serif',
            padding: '24px',
            textAlign: 'center',
            zIndex: 10
          }}
        >
          <h3 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 12px 0' }}>
            Ошибка 3D Рендеринга
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '13px', maxWidth: '420px', margin: '0 0 20px 0' }}>
            {this.state.error?.message || 'Произошел сбой графического контекста WebGL.'}
          </p>
          <button
            onClick={this.handleReset}
            style={{
              padding: '10px 20px',
              background: '#0284c7',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            🔄 Перезапустить сцену
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
