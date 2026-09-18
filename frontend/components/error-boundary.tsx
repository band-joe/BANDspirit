// components/error-boundary.tsx
'use client';
import { Component, ErrorInfo, ReactNode } from 'react';
import { ApiError } from '@/lib/errors';

interface Props  { children: ReactNode; fallback?: ReactNode; }
interface State  { hasError: boolean; error?: Error; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Fehler an Monitoring-Service senden (ggf. Sentry o.ä. einbinden)
    console.error('ErrorBoundary:', error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const err = this.state.error;
    const isApiErr = err instanceof ApiError;

    return (
      <div className="p-6 rounded-lg bg-destructive/10 text-destructive">
        <h2 className="font-semibold">
          {isApiErr ? `API-Fehler ${(err as ApiError).status}` : 'Unbekannter Fehler'}
        </h2>
        <p className="text-sm mt-1">{err?.message}</p>
      </div>
    );
  }
}
