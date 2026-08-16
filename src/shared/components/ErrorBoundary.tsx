import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
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
    console.error('ErrorBoundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="bg-stone-900 border border-red-900/60 rounded-xl p-6 max-w-lg text-center space-y-3">
            <div className="text-red-400 text-2xl font-bold">⚠ Application Error</div>
            <p className="text-stone-400 text-sm">
              An unexpected error occurred in this module. Your data is safe — try refreshing the page.
            </p>
            <pre className="text-[11px] text-red-300 bg-stone-950 p-3 rounded overflow-auto max-h-32 text-left">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded text-sm transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
