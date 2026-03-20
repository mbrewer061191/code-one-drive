import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="card" style={{ padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: 'var(--danger-color)' }}>Something went wrong</h2>
          <p style={{ margin: '1rem 0', color: 'var(--text-secondary)' }}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </p>
          <button 
            className="button" 
            onClick={() => window.location.reload()}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
