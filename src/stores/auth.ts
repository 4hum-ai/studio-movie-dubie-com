import { defineStore } from 'pinia'
import { ref, computed, type Ref } from 'vue'
import { useAuth } from '@/composables/useAuth'
import { useActivity } from '@/composables/useActivity'

export interface LoginCredentials {
  email: string
  password: string
}
export interface AuthUser {
  id: string
  email: string
  displayName?: string
  photoURL?: string
}

export const useAuthStore = defineStore('auth', () => {
  const user: Ref<AuthUser | null> = ref(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)

  const { login, loginWithGoogle, loginWithOAuth, logout, getCurrentUser } = useAuth()
  // Keep in sync with Firebase auth state changes
  let unsubscribe: (() => void) | null = null

  const isAuthenticated = computed(() => !!user.value)

  const initialize = async () => {
    try {
      isLoading.value = true
      error.value = null
      const current = await getCurrentUser()
      if (current) user.value = current
      if (!unsubscribe) {
        unsubscribe = useAuth().subscribe((u) => {
          user.value = u
        })
      }
    } finally {
      isLoading.value = false
    }
  }

  const loginUser = async (credentials: LoginCredentials) => {
    try {
      isLoading.value = true
      error.value = null
      const loggedIn = await login(credentials.email, credentials.password)
      user.value = loggedIn
      return loggedIn
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const loginWithGoogleUser = async () => {
    try {
      isLoading.value = true
      error.value = null
      const { user: loggedIn } = await loginWithGoogle()
      user.value = loggedIn
      return loggedIn
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const loginWithProvider = async (provider: 'google' | 'github' | 'microsoft' | 'apple') => {
    try {
      isLoading.value = true
      error.value = null
      console.log('🔐 Auth store: Starting login with provider:', provider)
      const { user: loggedIn } = await loginWithOAuth(provider)
      console.log('🔐 Auth store: Login successful, user:', loggedIn)
      user.value = loggedIn
      console.log('🔐 Auth store: User state updated:', user.value)
      console.log('🔐 Auth store: Is authenticated:', isAuthenticated.value)
      return loggedIn
    } catch (err) {
      console.error('🔐 Auth store: Login failed:', err)
      error.value = err instanceof Error ? err.message : 'Login failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const logoutUser = async () => {
    try {
      isLoading.value = true
      error.value = null
      await logout()
      user.value = null
      try {
        const { clearAll, stop } = useActivity()
        clearAll()
        stop()
      } catch {
        /* ignore */
      }
      // Clear listeners
      if (unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Logout failed'
      throw err
    } finally {
      isLoading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    initialize,
    loginUser,
    loginWithGoogleUser,
    loginWithProvider,
    logoutUser,
    clearError,
  }
})
