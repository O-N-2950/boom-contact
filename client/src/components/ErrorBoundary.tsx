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
        <div className="max-w-[420px] mx-auto my-0 p-8 flex flex-col items-center justify-center text-center" style={{ minHeight: '100svh' }}>
          <div className="text-[56px] mb-5">⚠️</div>
          <h2 className="text-xl font-bold mb-3">
            Une erreur est survenue
          </h2>
          <p className="text-sm mb-7 opacity-75 leading-[1.65]">
            L'application a rencontré un problème inattendu. Votre constat n'est pas perdu — rechargez la page pour continuer.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-[10px] border-0 text-white cursor-pointer text-[15px] font-bold mb-3 px-7 py-3.5" style={{ background: 'var(--boom)' }}
          >
            🔄 Recharger
          </button>
          {process.env.NODE_ENV !== 'production' && (
            <details className="mt-4 text-[11px] text-left max-w-full overflow-auto opacity-85">
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
