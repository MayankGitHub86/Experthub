import React from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

/**
 * Error Boundary Component
 * Catches and displays errors in child components to prevent app crash
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorCount: 0
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    console.error('🚨 Error caught by boundary:', error, errorInfo);
    
    this.setState(prevState => ({
      error,
      errorInfo,
      errorCount: prevState.errorCount + 1
    }));

    // Could send to error logging service here (Sentry, LogRocket, etc.)
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100vh',
          padding: '20px',
          backgroundColor: 'var(--surface-primary)',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{
            maxWidth: '500px',
            padding: '40px',
            borderRadius: '12px',
            backgroundColor: 'var(--surface-secondary)',
            border: '1px solid var(--border-subtle)',
            textAlign: 'center'
          }}>
            {/* Error Icon */}
            <div style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: 'rgba(239, 68, 68, 0.1)',
              border: '2px solid rgb(239, 68, 68)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
              color: 'rgb(239, 68, 68)'
            }}>
              <AlertTriangle size={32} />
            </div>

            {/* Error Title */}
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '12px',
              color: 'var(--text-primary)'
            }}>
              Something Went Wrong
            </h1>

            {/* Error Message */}
            <p style={{
              fontSize: '14px',
              color: 'var(--text-secondary)',
              marginBottom: '20px',
              lineHeight: '1.5'
            }}>
              We encountered an unexpected error. This has been logged, and our team has been notified.
            </p>

            {/* Error Details (dev only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div style={{
                textAlign: 'left',
                padding: '12px',
                backgroundColor: 'rgba(0, 0, 0, 0.05)',
                borderRadius: '8px',
                marginBottom: '20px',
                maxHeight: '200px',
                overflowY: 'auto',
                fontSize: '12px',
                fontFamily: 'monospace',
                color: 'var(--text-muted)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word'
              }}>
                <strong>Error: </strong>{this.state.error.toString()}
                {this.state.errorInfo && (
                  <>
                    {'\n\n'}
                    <strong>Component Stack:</strong>
                    {this.state.errorInfo.componentStack}
                  </>
                )}
              </div>
            )}

            {/* Error Counter */}
            {this.state.errorCount > 1 && (
              <p style={{
                fontSize: '12px',
                color: 'var(--text-muted)',
                marginBottom: '20px'
              }}>
                Error occurred {this.state.errorCount} times
              </p>
            )}

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'center'
            }}>
              <button
                onClick={this.handleReset}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: 'none',
                  backgroundColor: 'var(--accent-purple)',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.opacity = '0.9'}
                onMouseLeave={(e) => e.target.style.opacity = '1'}
              >
                <RotateCcw size={16} />
                Try Again
              </button>

              <button
                onClick={() => window.location.href = '/'}
                style={{
                  padding: '10px 20px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-subtle)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--surface-input)'}
                onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
