import { Component, ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { error: Error | null; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log to console (server-side logging endpoint not yet implemented)
    console.error('[ErrorBoundary]', error.message, info.componentStack?.slice(0, 300));
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          maxWidth: 420, margin: '0 auto', padding: 32,
          minHeight: '100svh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        }}>
          <div style={{ fontSize: 56, marginBottom: 20 }}>⚠️</div>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>
            Une erreur est survenue
          </h2>
          <p style={{ fontSize: 14, opacity: 0.55, lineHeight: 1.65, marginBottom: 28 }}>
            L'application a rencontré un problème inattendu. Votre constat n'est pas perdu — rechargez la page pour continuer.
          </p>
          <button
            onClick={() => window.location.reload()}
            style={{ padding: '14px 28px', borderRadius: 10, border: 'none', background: 'var(--boom)', color: '#fff', cursor: 'pointer', fontSize: 15, fontWeight: 700, marginBottom: 12 }}
          >
            🔄 Recharger
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <details style={{ marginTop: 16, fontSize: 11, opacity: 0.4, textAlign: 'left', maxWidth: '100%', overflow: 'auto' }}>
              <summary style={{ cursor: 'pointer' }}>Détail technique</summary>
              <pre style={{ marginTop: 8, whiteSpace: 'pre-wrap', wordBreak: 'break-all' }}>
                {this.state.error.message}{'\n'}{this.state.error.stack}
              </pre>
            </details>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}
