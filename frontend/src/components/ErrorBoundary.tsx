import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

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

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary]', error, info.componentStack);
  }

  private reset = () => this.setState({ hasError: false, error: null });

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-950 flex items-center justify-center px-4">
          <div className="glass-card p-8 max-w-md w-full text-center">
            <div className="w-10 h-10 bg-surface-800 border border-surface-700 rounded-lg flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-5 h-5 text-surface-300" />
            </div>
            <p className="text-white font-medium mb-2">Something went wrong</p>
            <p className="text-surface-400 text-sm mb-5 break-words">
              {this.state.error?.message ?? 'An unexpected error occurred'}
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.reset}
                className="text-sm text-brand-400 hover:text-brand-300 transition-colors"
              >
                Try again
              </button>
              <span className="text-surface-700">·</span>
              <button
                onClick={() => window.location.assign('/files')}
                className="text-sm text-surface-400 hover:text-surface-200 transition-colors"
              >
                Go to Files
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
