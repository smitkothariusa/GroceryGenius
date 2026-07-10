import { supabase } from './supabase';

// Supabase auth redirects put access/refresh tokens in the URL fragment, and
// other flows carry state in the query string — neither must ever be persisted.
function sanitizeUrl(): string {
  return window.location.origin + window.location.pathname;
}

interface SerializedError {
  message: string;
  stack: string | null;
}

// Supabase's PostgrestError (and similar API error shapes) are plain objects,
// not Error instances — String() on them yields "[object Object]".
function serializeError(error: unknown): SerializedError {
  if (error instanceof Error) {
    return { message: error.message, stack: error.stack ?? null };
  }
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const parts = ['message', 'code', 'details', 'hint']
      .filter((key) => typeof e[key] === 'string' && e[key])
      .map((key) => `${key}: ${e[key] as string}`);
    if (parts.length > 0) {
      return {
        message: parts.join(' | '),
        stack: typeof e.stack === 'string' ? e.stack : null,
      };
    }
    try {
      return { message: JSON.stringify(error), stack: null };
    } catch {
      return { message: Object.prototype.toString.call(error), stack: null };
    }
  }
  return { message: String(error), stack: null };
}

export async function logError(error: unknown, context: string): Promise<void> {
  try {
    const { message, stack } = serializeError(error);
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('error_logs').insert({
      user_id: user?.id ?? null,
      error_message: message,
      stack_trace: stack,
      context,
      url: sanitizeUrl(),
    });
  } catch {
    // intentionally silent — error logging must never crash the app
  }
}

export function initGlobalErrorHandlers(): void {
  window.onerror = (msg, _src, _line, _col, error) => {
    // Cross-origin-masked errors (typically injected browser extensions)
    // carry no actionable detail.
    if (!error && String(msg) === 'Script error.') {
      return false;
    }
    logError(error ?? msg, 'runtime');
    return false;
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    // Webviews and privacy extensions stub out serviceWorker.register and
    // reject it — environmental, not an app bug. Old cached index.html can
    // still load the injected registerSW.js, so filter here too.
    const { stack } = serializeError(event.reason);
    if (stack?.includes('registerSW')) {
      return;
    }
    logError(event.reason, 'runtime:unhandledrejection');
  };
}
