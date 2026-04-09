import React from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  remountKey: number;
}

export class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false, remountKey: 0 };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    /**
     * We are NOT hiding this error from the console on purpose.
     * It should stay visible so we can detect and debug real issues
     * (e.g. weird "undefined" cases during drag & drop).
     *
     * Here we only perform a soft remount to prevent the editor
     * from completely breaking for the user.
     */
    if (error.message?.includes('Cannot read properties of undefined')) {
      setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          remountKey: prev.remountKey + 1,
        }));
      }, 50);
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;

    return (
      <div key={this.state.remountKey} style={{ display: 'contents' }}>
        {this.props.children}
      </div>
    );
  }
}