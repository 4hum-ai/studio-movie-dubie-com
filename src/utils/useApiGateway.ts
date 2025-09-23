import { useEventBus } from '@vueuse/core'
import {
  EVENT_HTTP_ACTIVE,
  EVENT_HTTP_ERROR,
  type HttpActivePayload,
  type HttpErrorPayload,
} from '@/types/events'
import { createDefaultAuthProvider } from '@/providers/authProviderFactory'

export interface ApiClientOptions {
  /** Base URL for the API */
  baseUrl: string
  /** Default headers to include in all requests */
  defaultHeaders?: Record<string, string>
  /** Default timeout in milliseconds for requests */
  timeoutMs?: number
}

export interface RequestOptions extends RequestInit {
  /** Request timeout in milliseconds */
  timeoutMs?: number
}

export interface ApiClient {
  /** Make HTTP requests to the API */
  request: (path: string, options?: RequestOptions) => Promise<Response>
  /** Base URL of the API client */
  baseUrl: string
  /** Convenience method for GET requests */
  get: (path: string, options?: RequestOptions) => Promise<Response>
  /** Convenience method for POST requests */
  post: (path: string, body?: unknown, options?: RequestOptions) => Promise<Response>
  /** Convenience method for PUT requests */
  put: (path: string, body?: unknown, options?: RequestOptions) => Promise<Response>
  /** Convenience method for DELETE requests */
  delete: (path: string, options?: RequestOptions) => Promise<Response>
}

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.replace(/\/$/, '')
  const suffix = path.startsWith('/') ? path : `/${path}`
  return `${base}${suffix}`
}

async function buildAuthHeader(): Promise<Record<string, string>> {
  try {
    const provider = await createDefaultAuthProvider()
    const token = await provider.getIdToken()
    if (token) return { Authorization: `Bearer ${token}` }
  } catch {
    // Ignore auth header build failures; proceed without auth
  }
  return {}
}

export function createApiClient(options: ApiClientOptions): ApiClient {
  const { baseUrl, defaultHeaders = {}, timeoutMs } = options
  const activeBus = useEventBus<HttpActivePayload>(EVENT_HTTP_ACTIVE)
  const errorBus = useEventBus<HttpErrorPayload>(EVENT_HTTP_ERROR)
  let activeRequests = 0

  /**
   * Make HTTP requests with automatic authentication, error handling, and retry logic
   * @param path - API endpoint path
   * @param opts - Request options including method, body, headers, etc.
   * @returns Promise resolving to Response object
   *
   * @example
   * ```typescript
   * // GET request
   * const response = await client.request("/users");
   *
   * // POST request with body
   * const response = await client.request("/users", {
   *   method: "POST",
   *   body: JSON.stringify({ name: "John" }),
   *   timeoutMs: 5000
   * });
   *
   * // With custom headers
   * const response = await client.request("/users", {
   *   headers: { "X-Custom-Header": "value" }
   * });
   * ```
   */
  const request = async (path: string, opts: RequestOptions = {}): Promise<Response> => {
    const url = joinUrl(baseUrl, path)
    const authHeader = await buildAuthHeader()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...defaultHeaders,
      ...authHeader,
      ...(opts.headers as Record<string, string> | undefined),
    }

    // Prefer caller-provided AbortSignal. If none, optionally create a timeout-based signal.
    const timeoutValue = opts.timeoutMs ?? timeoutMs
    const computedSignal = opts.signal
      ? opts.signal
      : typeof AbortSignal !== 'undefined' &&
          (AbortSignal as { timeout?: (ms: number) => AbortSignal }).timeout
        ? timeoutValue
          ? (AbortSignal as { timeout: (ms: number) => AbortSignal }).timeout(timeoutValue)
          : undefined
        : undefined

    let response: Response
    // mark start
    activeRequests += 1
    activeBus.emit({ active: activeRequests })
    try {
      response = await fetch(url, { ...opts, headers, signal: computedSignal })
    } catch (error: unknown) {
      // Suppress toasts for intentional aborts
      if ((error as Error)?.name !== 'AbortError') {
        errorBus.emit({
          method: String(opts.method ?? 'GET'),
          path,
          message: String((error as Error)?.message ?? 'Request failed'),
        })
      }
      throw error
    } finally {
      // mark end
      activeRequests = Math.max(0, activeRequests - 1)
      activeBus.emit({ active: activeRequests })
    }

    if (response.status === 401) {
      try {
        const provider = await createDefaultAuthProvider()
        const refreshed = await provider.getIdToken(true)
        if (refreshed) {
          const retryHeaders = {
            ...headers,
            Authorization: `Bearer ${refreshed}`,
          }
          // mark start for retry
          activeRequests += 1
          activeBus.emit({ active: activeRequests })
          try {
            response = await fetch(url, {
              ...opts,
              headers: retryHeaders,
              signal: computedSignal,
            })
          } finally {
            activeRequests = Math.max(0, activeRequests - 1)
            activeBus.emit({ active: activeRequests })
          }
        }
      } catch {
        // Token refresh failed; return original unauthorized response
      }
    }

    // Do not toast for HTTP error statuses here; let callers decide contextually.
    return response
  }

  // Convenience methods
  const get = (path: string, options?: RequestOptions) =>
    request(path, { ...options, method: 'GET' })

  const post = (path: string, body?: unknown, options?: RequestOptions) =>
    request(path, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })

  const put = (path: string, body?: unknown, options?: RequestOptions) =>
    request(path, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })

  const deleteMethod = (path: string, options?: RequestOptions) =>
    request(path, { ...options, method: 'DELETE' })

  return { request, get, post, put, delete: deleteMethod, baseUrl }
}

/** Cache of API clients by base path */
const clientsByBase: Record<string, ApiClient> = {}

/**
 * API Gateway composable for making authenticated HTTP requests
 *
 * @param base - Base path for the API (defaults to "movie")
 * @returns API client instance
 *
 * @example
 * ```typescript
 * // Basic usage
 * const api = useApiGateway();
 * const response = await api.request("/titles");
 *
 * // With custom base path
 * const api = useApiGateway("custom-api");
 * const response = await api.request("/users");
 *
 * // Environment variables used:
 * // VITE_API_BASE_PATH - Overrides the base parameter
 * // VITE_PUBLIC_API_URL - Sets the root API URL
 * ```
 *
 * @example
 * ```typescript
 * // Making different types of requests
 * const api = useApiGateway();
 *
 * // GET request
 * const users = await api.request("/users");
 *
 * // POST request
 * const newUser = await api.request("/users", {
 *   method: "POST",
 *   body: JSON.stringify({ name: "John", email: "john@example.com" })
 * });
 *
 * // PUT request
 * const updatedUser = await api.request("/users/123", {
 *   method: "PUT",
 *   body: JSON.stringify({ name: "John Updated" })
 * });
 *
 * // DELETE request
 * await api.request("/users/123", { method: "DELETE" });
 *
 * // With timeout
 * const response = await api.request("/slow-endpoint", {
 *   timeoutMs: 5000
 * });
 *
 * // With AbortController for cancellation
 * const controller = new AbortController();
 * const response = await api.request("/long-running", {
 *   signal: controller.signal
 * });
 * // Later: controller.abort();
 * ```
 */
export function useApiGateway(base: string = 'movie'): ApiClient {
  // Allow env override for base path when provided
  const envBasePath = (import.meta as { env?: Record<string, unknown> }).env?.VITE_API_BASE_PATH as
    | string
    | undefined
  const normalizedBase =
    envBasePath && envBasePath.length > 0
      ? envBasePath.replace(/^\/+/, '').replace(/\/+$/, '')
      : base.replace(/^\/+/, '').replace(/\/+$/, '')

  if (clientsByBase[normalizedBase]) return clientsByBase[normalizedBase]
  const API_BASE = (import.meta as { env?: Record<string, unknown> }).env?.VITE_PUBLIC_API_URL as
    | string
    | undefined
  let baseUrl = ''
  if (API_BASE && /^https?:\/\//i.test(API_BASE)) {
    const root = API_BASE.replace(/\/$/, '')
    baseUrl = `${root}/${normalizedBase}`
  }

  const client = createApiClient({ baseUrl })
  clientsByBase[normalizedBase] = client
  return client
}
