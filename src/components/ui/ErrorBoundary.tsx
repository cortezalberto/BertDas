import { Component, type ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { Button } from './Button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('[ErrorBoundary] Error caught:', error)
    console.error('[ErrorBoundary] Component stack:', errorInfo.componentStack)
    this.props.onError?.(error, errorInfo)
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: null })
  }

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-[400px] flex items-center justify-center p-8">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto">
              <AlertTriangle className="w-8 h-8 text-red-500" aria-hidden="true" />
            </div>
            <h2 className="text-xl font-semibold text-white">
              Algo salió mal
            </h2>
            <p className="text-zinc-400 max-w-md">
              Ha ocurrido un error inesperado. Por favor, intenta recargar la página.
            </p>
            {this.state.error && (
              <details className="text-left bg-zinc-900 rounded-lg p-4 max-w-md mx-auto">
                <summary className="text-zinc-400 cursor-pointer text-sm">
                  Detalles del error
                </summary>
                <pre className="mt-2 text-xs text-red-400 overflow-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <Button
                variant="secondary"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="w-4 h-4 mr-2" aria-hidden="true" />
                Recargar página
              </Button>
              <Button onClick={this.handleReset}>
                Intentar de nuevo
              </Button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
