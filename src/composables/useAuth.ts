import { ref, readonly, computed } from 'vue'
import type { AuthUser } from '@/types/auth'
import { createDefaultAuthProvider } from '@/providers/authProviderFactory'
import type { AuthProvider } from '@/types/auth'

// Global provider instance
let authProvider: AuthProvider | null = null

async function getAuthProvider(): Promise<AuthProvider> {
  if (!authProvider) {
    authProvider = await createDefaultAuthProvider()
  }
  return authProvider
}

export function useAuth() {
  const isLoading = ref(true)
  const error = ref<string | null>(null)
  const user = ref<AuthUser | null>(null)

  const getCurrentUser = async (): Promise<AuthUser | null> => {
    try {
      const provider = await getAuthProvider()
      const currentUser = await provider.getCurrentUser()
      user.value = currentUser
      isLoading.value = false
      return currentUser
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to get current user'
      error.value = message
      isLoading.value = false
      throw new Error(message)
    }
  }

  const subscribe = (cb: (u: AuthUser | null) => void): (() => void) => {
    let unsubscribe: (() => void) | null = null

    getAuthProvider()
      .then((provider) => {
        unsubscribe = provider.subscribe((authUser) => {
          user.value = authUser
          cb(authUser)
          isLoading.value = false
        })
      })
      .catch((err) => {
        const message = err instanceof Error ? err.message : 'Failed to subscribe to auth state'
        error.value = message
        isLoading.value = false
      })

    return () => {
      if (unsubscribe) {
        unsubscribe()
      }
    }
  }

  const login = async (email: string, password: string): Promise<AuthUser> => {
    try {
      error.value = null
      const provider = await getAuthProvider()
      const authUser = await provider.login(email, password)
      user.value = authUser
      return authUser
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed'
      error.value = message
      throw new Error(message)
    }
  }

  const loginWithGoogle = async (): Promise<{
    user: AuthUser
    newUser?: boolean
  }> => {
    try {
      error.value = null
      const provider = await getAuthProvider()
      const result = await provider.loginWithGoogle()
      user.value = result.user
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google login failed'
      error.value = message
      throw new Error(message)
    }
  }

  const loginWithOAuth = async (
    providerName: 'google' | 'github' | 'microsoft' | 'apple',
  ): Promise<{ user: AuthUser; newUser?: boolean }> => {
    try {
      error.value = null
      const provider = await getAuthProvider()
      const result = await provider.loginWithOAuth(providerName)
      user.value = result.user
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'OAuth login failed'
      error.value = message
      throw new Error(message)
    }
  }

  const logout = async (): Promise<void> => {
    try {
      error.value = null
      const provider = await getAuthProvider()
      await provider.logout()
      user.value = null
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Logout failed'
      error.value = message
      throw new Error(message)
    }
  }

  /**
   * Computed property indicating if user is authenticated
   */
  const isAuthenticated = computed(() => !!user.value)

  /**
   * Set authentication persistence mode
   * @param mode - Persistence mode: 'local' (persists across browser sessions) or 'session' (cleared when browser closes)
   *
   * @example
   * ```typescript
   * // Keep user logged in across browser sessions
   * await auth.setPersistenceMode('local');
   *
   * // Clear session when browser closes
   * await auth.setPersistenceMode('session');
   * ```
   */
  const setPersistenceMode = async (mode: 'local' | 'session') => {
    try {
      const provider = await getAuthProvider()
      await provider.setPersistenceMode(mode)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to set persistence mode'
      error.value = message
      throw new Error(message)
    }
  }

  return {
    user: readonly(user),
    isLoading: readonly(isLoading),
    error: readonly(error),
    isAuthenticated,
    getCurrentUser,
    subscribe,
    login,
    loginWithGoogle,
    loginWithOAuth,
    logout,
    setPersistenceMode,
  }
}
