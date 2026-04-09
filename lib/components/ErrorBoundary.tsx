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
    console.warn("[ErrorBoundary] editor crashed:", error.message, error.stack);

    /**
     * This is a known upstream bug in BlockNote: their internal useMemo does
     * not guard against undefined blocks during concurrent Yjs/ProseMirror
     * transactions (e.g. during drag-and-drop of table blocks).
     *
     * We match by error message (browser-specific) + useMemo in the stack
     * (React API name, never minified) to avoid swallowing unrelated crashes.
     *
     * Chrome/Edge: "Cannot read properties of undefined (reading 'id')"
     * Firefox: "can't access property "id", r.block is undefined"
     */
    const isKnownBlockNoteBug =
      (error.message?.includes('Cannot read properties of undefined') ||
       error.message?.includes("can't access property")) &&
      error.stack?.includes('useMemo');

    if (!isKnownBlockNoteBug) return;

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