'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertOctagon } from 'lucide-react';
import { Button } from './button';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in boundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  public render() {
    if (this.state.hasError) {
      if (this.fallback) {
        return this.fallback;
      }

      return (
        <div className="flex min-h-[400px] flex-col items-center justify-center rounded-xl border border-border bg-card/20 p-8 text-center text-card-foreground shadow-sm backdrop-blur-md max-w-xl mx-auto my-12">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10 text-destructive mb-6">
            <AlertOctagon className="h-7 w-7" />
          </div>
          <h2 className="text-xl font-bold tracking-tight text-foreground mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed mb-6 max-w-md">
            An unexpected error occurred in this workspace component. Please refresh the page or contact support if the issue persists.
          </p>
          {this.state.error && (
            <pre className="w-full text-left text-xs font-mono bg-background/50 border border-border/50 rounded-lg p-4 mb-6 overflow-x-auto text-destructive max-h-[150px]">
              {this.state.error.message}
            </pre>
          )}
          <Button variant="outline" size="sm" onClick={this.handleReset}>
            Refresh Workspace
          </Button>
        </div>
      );
    }

    return this.props.children;
  }

  // Helper getter to avoid binding issues on class properties
  private get fallback() {
    return this.props.fallback;
  }
}
