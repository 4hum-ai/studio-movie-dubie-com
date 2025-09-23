import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { MockedFunction } from 'vitest'
import { createApiClient } from '../../src/utils/useApiGateway'

// Mock the auth provider factory
vi.mock('@/providers/authProviderFactory', () => ({
  createDefaultAuthProvider: vi.fn(),
}))

vi.mock('@/composables/useToast', () => ({
  useToast: () => ({
    push: vi.fn(),
  }),
}))

// Mock fetch type for global scope
interface MockFetch {
  (input: RequestInfo | URL, init?: RequestInit): Promise<Response>
}

interface ExtendedAbortSignal {
  timeout?: (ms: number) => AbortSignal
}

interface MockGlobalThis {
  fetch: MockFetch
  AbortSignal: typeof AbortSignal & ExtendedAbortSignal
}

describe('useApiGateway / createApiClient', () => {
  const originalFetch = globalThis.fetch
  const originalAbortSignal = globalThis.AbortSignal

  beforeEach(() => {
    vi.useRealTimers()
    // Basic polyfill for AbortSignal.timeout if missing
    if (!globalThis.AbortSignal || !('timeout' in globalThis.AbortSignal)) {
      class AbortSignalPolyfill extends AbortSignal {
        static timeout(ms: number): AbortSignal {
          const controller = new AbortController()
          setTimeout(() => controller.abort(), ms)
          return controller.signal
        }
      }
      // Type assertion to add timeout method
      const MockedAbortSignal = AbortSignalPolyfill as typeof AbortSignal & {
        timeout: (ms: number) => AbortSignal
      }
      ;(globalThis as unknown as MockGlobalThis).AbortSignal = MockedAbortSignal
    }
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    globalThis.AbortSignal = originalAbortSignal
    vi.restoreAllMocks()
  })

  it('joins URLs correctly and includes headers with token when available', async () => {
    const { createDefaultAuthProvider } = await import('@/providers/authProviderFactory')
    const mockCreateDefaultAuthProvider = createDefaultAuthProvider as MockedFunction<
      typeof createDefaultAuthProvider
    >

    const mockProvider = {
      getIdToken: vi.fn(async () => 'test-token'),
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateDefaultAuthProvider.mockResolvedValue(mockProvider as any)

    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    globalThis.fetch = fetchSpy

    const api = createApiClient({
      baseUrl: 'https://api.example.com/',
      defaultHeaders: { 'X-App': 'admin' },
    })
    await api.request('/health', { method: 'GET' })

    expect(fetchSpy).toHaveBeenCalledTimes(1)
    const calls = fetchSpy.mock.calls
    expect(calls).toHaveLength(1)

    const [calledUrl, calledInit] = calls[0] as [string, RequestInit]
    expect(calledUrl).toBe('https://api.example.com/health')
    expect(calledInit?.headers).toBeDefined()

    const headers = calledInit.headers as Record<string, string>
    expect(headers['Authorization']).toBe('Bearer test-token')
    expect(headers['X-App']).toBe('admin')
  })

  it('retries once on 401 with refreshed token', async () => {
    const { createDefaultAuthProvider } = await import('@/providers/authProviderFactory')
    const mockCreateDefaultAuthProvider = createDefaultAuthProvider as MockedFunction<
      typeof createDefaultAuthProvider
    >

    const mockProvider = {
      getIdToken: vi
        .fn()
        .mockResolvedValueOnce('old-token') // First call (buildAuthHeader)
        .mockResolvedValueOnce('new-token'), // Second call (retry with force refresh)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockCreateDefaultAuthProvider.mockResolvedValue(mockProvider as any)

    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    globalThis.fetch = fetchSpy

    const api = createApiClient({ baseUrl: 'https://api.example.com' })
    const res = await api.request('/secure')

    expect(res.status).toBe(200)
    expect(fetchSpy).toHaveBeenCalledTimes(2)
  })

  it('respects provided AbortSignal and does not override it', async () => {
    const controller = new AbortController()
    const signal = controller.signal

    const fetchSpy = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    globalThis.fetch = fetchSpy

    const api = createApiClient({
      baseUrl: 'https://api.example.com',
      timeoutMs: 25,
    })
    await api.request('/data', { signal })

    const calls = fetchSpy.mock.calls
    expect(calls).toHaveLength(1)

    const calledInit = calls[0]?.[1] as RequestInit | undefined
    expect(calledInit?.signal).toBe(signal)
  })

  it('builds base from import.meta env in useApiGateway', async () => {
    vi.resetModules()
    const mod = await import('../../src/utils/useApiGateway')
    const client = mod.useApiGateway()

    interface ImportMetaEnv {
      VITE_PUBLIC_API_URL?: string
      VITE_API_BASE_PATH?: string
    }

    interface ImportMeta {
      env?: ImportMetaEnv
    }

    const env = (import.meta as ImportMeta).env || {}
    const raw = env.VITE_PUBLIC_API_URL
    let expected = ''
    if (raw && /^https?:\/\//i.test(raw)) {
      const root = raw.replace(/\/$/, '')
      const rawPath = env.VITE_API_BASE_PATH
      const suffix = rawPath ? `/${rawPath.replace(/^\//, '').replace(/\/$/, '')}` : '/movie'
      expected = `${root}${suffix}`
    }
    expect(client.baseUrl).toBe(expected)
  })
})
