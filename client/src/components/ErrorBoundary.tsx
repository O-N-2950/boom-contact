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
          <div className="text-[56px] mb-5">⚠️</div>
          <h2 className="text-xl font-bold mb-3">
            Une erreur est survenue
          </h2>
          <p className="text-sm mb-7" style={{ opacity: 0.75, lineHeight: 1.65 }}>
            L'application a rencontré un problème inattendu. Votre constat n'est pas perdu — rechargez la page pour continuer.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-[10px] border-0 text-white cursor-pointer text-[15px] font-bold mb-3" style={{ padding: '14px 28px', background: 'var(--boom)' }}
          >
            🔄 Recharger
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <details className="mt-4 text-[11px] text-left max-w-full overflow-auto" style={{ opacity: 0.85 }}>
              <summary className="cursor-pointer">Détail technique</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all">
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
