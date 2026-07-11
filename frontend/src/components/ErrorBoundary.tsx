import { Component, ErrorInfo, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { logError } from '../lib/errorService';

interface Props {
  children: ReactNode;
  /** Custom fallback renderer. If omitted, a default gradient card is shown. */
  fallback?: (error: Error, reset: () => void) => ReactNode;
  /**
   * Identifies which part of the app this boundary guards (e.g. 'root',
   * 'section:pantry'). Passed through to logError as context so a caught
   * render error is traceable the same way backend/runtime errors are.
   */
  context: string;
  /** Use the compact "one section crashed" fallback instead of the full-page one. */
  variant?: 'root' | 'section';
}

interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Route through the same error_logs pipeline used for Supabase/runtime
    // errors elsewhere in the app (see lib/errorService.ts), not just console.
    logError(error, `boundary:${this.props.context}`);
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.error('ErrorBoundary caught an error', error, info.componentStack);
    }
  }

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return (
        <DefaultFallback
          reset={this.reset}
          variant={this.props.variant ?? 'root'}
        />
      );
    }
    return this.props.children;
  }
}

function DefaultFallback({
  reset,
  variant,
}: {
  reset: () => void;
  variant: 'root' | 'section';
}) {
  const { t } = useTranslation();

  const handlePrimaryAction = () => {
    if (variant === 'root') {
      window.location.reload();
    } else {
      reset();
    }
  };

  const isRoot = variant === 'root';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        gap: '1rem',
        padding: isRoot ? '2rem 1.25rem' : '1.5rem 1rem',
        minHeight: isRoot ? '100vh' : 'auto',
        width: '100%',
        boxSizing: 'border-box',
        background: isRoot
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'rgba(239, 68, 68, 0.06)',
        borderRadius: isRoot ? 0 : '16px',
        border: isRoot ? 'none' : '1px solid rgba(239, 68, 68, 0.25)',
        color: isRoot ? '#fff' : '#111827',
        fontFamily: 'system-ui, -apple-system, sans-serif',
      }}
    >
      <span style={{ fontSize: '2.5rem' }}>⚠️</span>
      <h2
        style={{
          margin: 0,
          fontSize: isRoot ? '1.5rem' : '1.125rem',
          fontWeight: 700,
        }}
      >
        {isRoot ? t('errorBoundary.root.title') : t('errorBoundary.section.title')}
      </h2>
      <p
        style={{
          margin: 0,
          maxWidth: '32rem',
          fontSize: '0.95rem',
          opacity: isRoot ? 0.92 : 0.85,
          lineHeight: 1.5,
        }}
      >
        {isRoot ? t('errorBoundary.root.message') : t('errorBoundary.section.message')}
      </p>
      <button
        onClick={handlePrimaryAction}
        style={{
          marginTop: '0.5rem',
          padding: '0.75rem 1.5rem',
          borderRadius: '10px',
          border: 'none',
          fontWeight: 600,
          fontSize: '0.95rem',
          cursor: 'pointer',
          background: isRoot ? 'rgba(255,255,255,0.95)' : '#667eea',
          color: isRoot ? '#764ba2' : '#fff',
          minHeight: '44px',
          minWidth: '9rem',
        }}
      >
        {isRoot ? t('errorBoundary.root.reload') : t('errorBoundary.section.tryAgain')}
      </button>
    </div>
  );
}
