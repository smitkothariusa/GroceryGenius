import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import '../i18n';
import { ErrorBoundary } from './ErrorBoundary';

// logError talks to Supabase; stub it out so the test doesn't depend on a
// live backend and doesn't spam network calls when the boundary catches.
vi.mock('../lib/errorService', () => ({
  logError: vi.fn().mockResolvedValue(undefined),
}));

function Boom(): never {
  throw new Error('kaboom');
}

describe('ErrorBoundary', () => {
  beforeEach(() => {
    // React logs the caught error to console.error; keep test output clean.
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary context="test">
        <div>all good</div>
      </ErrorBoundary>
    );
    expect(screen.getByText('all good')).toBeInTheDocument();
  });

  it('catches a render error and shows the fallback instead of crashing', () => {
    render(
      <ErrorBoundary context="test">
        <Boom />
      </ErrorBoundary>
    );

    // Default fallback renders a heading + a primary action button;
    // exact copy comes from i18n, so assert on presence rather than text.
    expect(screen.getByRole('heading')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('uses a custom fallback renderer when provided', () => {
    render(
      <ErrorBoundary context="test" fallback={(error) => <div>custom: {error.message}</div>}>
        <Boom />
      </ErrorBoundary>
    );

    expect(screen.getByText('custom: kaboom')).toBeInTheDocument();
  });

  it('section variant reset button re-renders children after state is cleared', () => {
    let shouldThrow = true;
    function MaybeBoom() {
      if (shouldThrow) throw new Error('kaboom');
      return <div>recovered</div>;
    }

    render(
      <ErrorBoundary context="test" variant="section">
        <MaybeBoom />
      </ErrorBoundary>
    );

    const button = screen.getByRole('button');
    shouldThrow = false;
    fireEvent.click(button);

    expect(screen.getByText('recovered')).toBeInTheDocument();
  });
});
