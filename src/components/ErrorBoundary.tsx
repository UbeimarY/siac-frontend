import { Component, type ErrorInfo, type ReactNode } from 'react'

/** Evita que un error inesperado deje la pantalla en blanco. */
export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Error de interfaz', error, info.componentStack)
  }

  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="mx-auto max-w-lg py-20 text-center">
        <p className="text-lg font-semibold text-marca-900">Algo salió mal en esta pantalla</p>
        <p className="mt-2 text-sm text-slate-600">Puede volver a intentarlo. Si el problema continúa, informe a la coordinación de calidad.</p>
        <p className="mt-2 font-mono text-xs text-slate-400">{this.state.error.message}</p>
        <button className="btn-primario mt-6" onClick={() => this.setState({ error: null })}>Reintentar</button>
      </div>
    )
  }
}
