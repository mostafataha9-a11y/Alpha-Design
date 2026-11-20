/**
 * Authentication and API helper for Alpha Decor & Paints
 * Pure HttpOnly Cookie-based Authentication (Zero localStorage session token storage)
 */

export function getAuthToken(): string | null {
  // Session tokens are strictly stored in HttpOnly cookies on server-hosted environments
  return null;
}

export function setAuthToken(_token?: string): void {
  // Deprecated for security: Sessions are exclusively managed via secure HttpOnly cookies
  try {
    localStorage.removeItem('alpha_session_token');
  } catch {
    // Ignore storage errors
  }
}

export function clearAuthToken(): void {
  try {
    localStorage.removeItem('alpha_session_token');
  } catch {
    // Ignore storage errors
  }
}

export function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
}

export function isJsonResponse(res: Response | null | undefined): boolean {
  if (!res) return false;
  const ct = (res.headers.get('content-type') || '').toLowerCase();
  return ct.includes('application/json');
}

export async function safeReadJson<T = any>(res: Response | null | undefined): Promise<T | null> {
  if (!res || !isJsonResponse(res)) return null;
  try {
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function sha256Hex(value: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const bytes = encoder.encode(value);
    const digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  return '';
}

export async function fetchWithAuth(url: string, options: RequestInit = {}): Promise<Response> {
  const headers = new Headers(options.headers || {});
  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Automatically passes secure HttpOnly alpha_session cookie
  });
}
