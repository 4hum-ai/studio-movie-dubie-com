/**
 * Authentication provider interface
 * Defines the contract that all authentication providers must implement
 */
export interface AuthProvider {
  /** Initialize the authentication provider */
  initialize(): Promise<void>

  /** Get the current authenticated user */
  getCurrentUser(): Promise<AuthUser | null>

  /** Subscribe to authentication state changes */
  subscribe(callback: (user: AuthUser | null) => void): () => void

  /** Sign in with email and password */
  login(email: string, password: string): Promise<AuthUser>

  /** Sign in with Google OAuth */
  loginWithGoogle(): Promise<{ user: AuthUser; newUser?: boolean }>

  /** Sign in with OAuth provider */
  loginWithOAuth(
    provider: 'google' | 'github' | 'microsoft' | 'apple',
  ): Promise<{ user: AuthUser; newUser?: boolean }>

  /** Sign out the current user */
  logout(): Promise<void>

  /** Set authentication persistence mode */
  setPersistenceMode(mode: 'local' | 'session'): Promise<void>

  /** Get ID token for API authentication */
  getIdToken(forceRefresh?: boolean): Promise<string | null>
}

/**
 * Standardized user interface across all providers
 */
export interface AuthUser {
  /** Unique user identifier */
  id: string
  /** User's email address */
  email: string
  /** User's display name (optional) */
  displayName?: string
  /** URL to user's profile photo (optional) */
  photoURL?: string
}

/**
 * Authentication provider types
 */
export type AuthProviderType = 'firebase' | 'gis'

/**
 * Authentication configuration
 */
export interface AuthConfig {
  provider: AuthProviderType
  firebase?: {
    apiKey: string
    authDomain: string
    projectId: string
    storageBucket: string
    messagingSenderId: string
    appId: string
  }
  gis?: {
    clientId: string
  }
}
