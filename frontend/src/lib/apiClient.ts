// frontend/src/lib/apiClient.ts
import { supabase } from './supabase';

/**
 * fetch() that attaches the Supabase session access token as a Bearer token.
 * Backend API routes require it and return 401 without one.
 * Uses a Headers object so FormData bodies keep their multipart boundary.
 */
export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  return fetch(input, { ...init, headers });
}
