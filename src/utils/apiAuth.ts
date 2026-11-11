/**
 * Authentication and API helper for Alpha Decor & Paints
 * Pure HttpOnly Cookie-based Authentication (Zero localStorage secret storage)
 */

export function getAuthToken(): string | null {
  // Session tokens are strictly stored in HttpOnly cookies, not accessible via JavaScript/localStorage
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
