import { supabase } from './supabase';

export async function logError(error: unknown, context: string): Promise<void> {
  try {
    const message = error instanceof Error ? error.message : String(error);
    const stack = error instanceof Error ? (error.stack ?? null) : null;
    const { data: { user } } = await supabase.auth.getUser();

    await supabase.from('error_logs').insert({
      user_id: user?.id ?? null,
      error_message: message,
      stack_trace: stack,
      context,
      url: window.location.href,
    });
  } catch {
    // intentionally silent — error logging must never crash the app
  }
}

export function initGlobalErrorHandlers(): void {
  window.onerror = (_msg, _src, _line, _col, error) => {
    logError(error ?? _msg, 'runtime');
    return false;
  };

  window.onunhandledrejection = (event: PromiseRejectionEvent) => {
    logError(event.reason, 'runtime:unhandledrejection');
  };
}
