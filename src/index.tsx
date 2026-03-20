import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

// Top-level ErrorBoundary to catch initialization errors
class GlobalErrorBoundary extends React.Component<{ children: React.ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
        console.error("GLOBAL Error Boundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{ padding: '2rem', textAlign: 'center', background: '#fee2e2', color: '#991b1b', minHeight: '100vh', fontFamily: 'sans-serif' }}>
                    <h1>Application Failed to Load</h1>
                    <p style={{ margin: '1rem 0' }}>{this.state.error?.message || 'An unknown error occurred during initialization.'}</p>
                    <pre style={{ textAlign: 'left', background: '#fff', padding: '1rem', borderRadius: '4px', overflow: 'auto', fontSize: '0.8rem' }}>
                        {this.state.error?.stack}
                    </pre>
                    <button 
                        onClick={() => window.location.reload()} 
                        style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#991b1b', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                    >
                        Retry Loading
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

console.log("index.tsx: Starting application render...");

const container = document.getElementById('root');
if (container) {
    console.log("index.tsx: Root container found, rendering App...");
    const root = createRoot(container);
    root.render(
        <GlobalErrorBoundary>
            <App />
        </GlobalErrorBoundary>
    );
} else {
    console.error("index.tsx: Root container NOT found!");
}
