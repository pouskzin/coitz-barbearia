// ---------------------------------------------------------------------------
// Single-flight refresh mechanism
// If multiple requests get 401 simultaneously (e.g. SPA loading with
// parallel API calls), only ONE refresh request is fired. All others
// wait on the same promise.
// ---------------------------------------------------------------------------
let refreshPromise: Promise<boolean> | null = null;

async function attemptRefresh(): Promise<boolean> {
  // If a refresh is already in flight, piggyback on it
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const res = await fetch('/api/admin/refresh', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      });
      return res.ok;
    } catch {
      return false;
    } finally {
      // Clear the lock so future 401s can retry
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

// ---------------------------------------------------------------------------
// Checks if a response indicates an expired access token
// (the specific code our auth.ts returns for TokenExpiredError)
// ---------------------------------------------------------------------------
async function isTokenExpired(res: Response): Promise<boolean> {
  if (res.status !== 401) return false;
  try {
    const cloned = res.clone();
    const body = await cloned.json();
    return body?.code === 'TOKEN_EXPIRED';
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Core fetch wrapper with transparent token refresh
// ---------------------------------------------------------------------------
async function fetchWithRefresh(url: string, options?: RequestInit): Promise<Response> {
  const opts: RequestInit = { ...options, credentials: 'include' };
  let res = await fetch(url, opts);

  // If access token expired, try silent refresh ONCE
  if (await isTokenExpired(res)) {
    const refreshed = await attemptRefresh();
    if (refreshed) {
      // Retry the original request with the new access token cookie
      res = await fetch(url, opts);
    }
  }

  return res;
}

export const api = {
  get: async (url: string) => {
    const res = await fetchWithRefresh(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  post: async (url: string, data: any) => {
    const res = await fetchWithRefresh(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw err;
    }
    return res.json();
  },
  patch: async (url: string, data: any) => {
    const res = await fetchWithRefresh(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw err;
    }
    return res.json();
  }
};
