import { Component, type ErrorInfo, type ReactNode } from 'react';

/** Red de seguridad: ante cualquier error de render muestra una pantalla de recuperación en vez de quedarse en blanco. */
export class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError(): { failed: boolean } { return { failed: true }; }
  componentDidCatch(error: Error, info: ErrorInfo): void { console.error('STACKS error', error, info.componentStack); }
  render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <div className="screen obsidian grid place-items-center p-6 text-center">
        <div className="glass-panel max-w-xs rounded-3xl p-6">
          <h1 className="font-display text-2xl font-black gold-text">Algo ha fallado</h1>
          <p className="mt-2 text-sm" style={{ color: 'var(--color-muted)' }}>La mesa se ha cerrado inesperadamente. Tus fichas están a salvo.</p>
          <button type="button" className="btn btn--gold mt-4 w-full" onClick={() => { location.hash = '#/'; location.reload(); }}>Volver al inicio</button>
        </div>
      </div>
    );
  }
}
