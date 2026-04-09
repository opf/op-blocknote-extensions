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

  private remountTimer: ReturnType<typeof setTimeout> | null = null;

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.warn('[ErrorBoundary] editor crashed, scheduling remount:', error.message);

    if (this.remountTimer) clearTimeout(this.remountTimer);

    this.remountTimer = setTimeout(() => {
      this.setState((prev) => ({
        hasError: false,
        remountKey: prev.remountKey + 1,
      }));
    }, 50);
  }

  componentWillUnmount() {
    if (this.remountTimer) clearTimeout(this.remountTimer);
  }

  render() {
    if (this.state.hasError) return this.props.fallback ?? null;

    return (
      <React.Fragment key={this.state.remountKey}>
        {this.props.children}
      </React.Fragment>
    );
  }
}