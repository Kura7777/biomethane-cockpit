import { AlertTriangle } from 'lucide-react';
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
      const isChunkError =
        this.state.error?.message?.includes('dynamically imported module') ||
        this.state.error?.message?.includes('Failed to fetch') ||
        this.state.error?.name === 'ChunkLoadError';

      return (
        <div className="flex items-center justify-center min-h-[400px] p-8">
          <div className="bg-[#0e1118] border border-red-900/60 p-5 max-w-lg text-center space-y-3 shadow-xl">
            <div className="text-red-400 text-xl font-bold flex items-center justify-center gap-2">
              <AlertTriangle className="w-6 h-6 shrink-0" aria-hidden="true" />
              {isChunkError ? 'New Desk Version Deployed' : 'Application Error'}
            </div>
            <p className="text-zinc-400 text-sm">
              {isChunkError
                ? 'A new version of the Biomethane Desk has been deployed to production. Refresh to load the latest module.'
                : 'An unexpected error occurred in this module. Your data is safe — try refreshing the page.'}
            </p>
            <pre className="text-meta text-red-300 bg-[#08090d] p-3 rounded overflow-auto max-h-32 text-left">
              {this.state.error?.message}
            </pre>
            <button
              onClick={() => {
                if (isChunkError) {
                  window.location.reload();
                } else {
                  this.setState({ hasError: false, error: null });
                }
              }}
              className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded text-sm transition-colors cursor-pointer"
            >
              {isChunkError ? 'Refresh Application' : 'Try Again'}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
