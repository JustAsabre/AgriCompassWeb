import { QueryClient, QueryFunction } from "@tanstack/react-query";

const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://agricompassweb.fly.dev';

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<any> {
  const headers: Record<string, string> = {};
  
  if (data) {
    headers["Content-Type"] = "application/json";
  }

  // Attach CSRF token for unsafe HTTP methods
  // CSRF is currently disabled on the backend, skip token fetching
  /*
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method.toUpperCase())) {
    try {
      const token = await getCsrfToken();
      if (token) headers['X-CSRF-Token'] = token;
    } catch (err) {
      console.warn('Could not fetch CSRF token, request will proceed without X-CSRF-Token header.');
    }
  }
  */

  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
  const res = await fetch(fullUrl, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include", // Important: Send session cookie
  });

  // If we got a 403, try to refresh CSRF token once and retry
  // CSRF is currently disabled, skip retry logic
  /*
  if (res.status === 403 && !url.endsWith('/api/csrf-token')) {
    // Clear cached token and retry
    csrfTokenCache = null;
    const refreshed = await getCsrfToken();
    if (refreshed) {
      headers['X-CSRF-Token'] = refreshed;
      const second = await fetch(fullUrl, {
        method,
        headers,
        body: data ? JSON.stringify(data) : undefined,
        credentials: 'include',
      });
      await throwIfResNotOk(second);
      const contentType2 = second.headers.get('content-type');
      if (contentType2 && contentType2.includes('application/json')) {
        return await second.json();
      }
      return second;
    }
  }
  */

  await throwIfResNotOk(res);
  
  // Return JSON data instead of Response object
  const contentType = res.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return await res.json();
  }
  return res;
}

// Simple CSRF token caching and retrieval for client requests
let csrfTokenCache: string | null = null;
export async function getCsrfToken(): Promise<string | null> {
  try {
    if (csrfTokenCache) return csrfTokenCache;
    const res = await fetch(`${API_BASE_URL}/api/csrf-token`, { credentials: 'include' });
    if (!res.ok) return null;
    const data = await res.json();
    csrfTokenCache = data.csrfToken;
    return csrfTokenCache;
  } catch (err) {
    console.error('Failed to fetch CSRF token', err);
    return null;
  }
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Only use the first element of queryKey as the URL
    // Additional elements are for cache differentiation only
    const url = queryKey[0] as string;
    const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;
    const res = await fetch(fullUrl, {
      credentials: "include", // Important: Send session cookie
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true, // Refetch when user returns to tab
      staleTime: 30000, // Consider data stale after 30 seconds
      retry: false,
    },
    mutations: {
      retry: false,
      // Note: Individual mutations with onSuccess will override this
      // We'll need to manually invalidate in each mutation's onSuccess
    },
  },
});

// Helper function to invalidate all related queries after mutations
// Call this in your mutation's onSuccess handler
export function invalidateAllQueries() {
  queryClient.invalidateQueries();
}
