// frontend/src/lib/apiClient.ts
import { supabase } from './supabase';
import { notifyRateLimited } from './rateLimitBridge';

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
  const response = await fetch(input, { ...init, headers });
  // Backend slowapi rate limits (10/min heavy, 30/min light) return 429.
  // Surface a shared "slow down" toast without disturbing each call site's
  // existing success/error handling — callers still see the raw Response.
  if (response.status === 429) notifyRateLimited();
  return response;
}
