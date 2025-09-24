import type { AuthProvider, AuthConfig, AuthProviderType } from '@/types/auth'
import { FirebaseAuthProvider } from './firebaseAuthProvider'
import { GisAuthProvider } from './gisAuthProvider'

/**
 * Factory function to create authentication providers based on configuration
 */
export function createAuthProvider(config: AuthConfig): AuthProvider {
  switch (config.provider) {
    case 'firebase':
      if (!config.firebase) {
        throw new Error('Firebase configuration is required when using Firebase provider')
      }
      return new FirebaseAuthProvider(config.firebase)

    case 'gis':
      if (!config.gis) {
        throw new Error(
          'Google Identity Services configuration is required when using GIS provider',
        )
      }
      return new GisAuthProvider(config.gis)

    default:
      throw new Error(`Unsupported authentication provider: ${config.provider}`)
  }
}

/**
 * Get authentication configuration from environment variables
 */
export function getAuthConfigFromEnv(): AuthConfig {
  const provider = (import.meta.env.VITE_AUTH_PROVIDER as AuthProviderType) || 'firebase'

  const config: AuthConfig = {
    provider,
  }

  if (provider === 'firebase') {
    const firebaseConfig = {
      apiKey: import.meta.env.VITE_FIREBASE_API_KEY as string,
      authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN as string,
      projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID as string,
      storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET as string,
      messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID as string,
      appId: import.meta.env.VITE_FIREBASE_APP_ID as string,
    }

    // Validate required Firebase config
    const requiredKeys = [
      'apiKey',
      'authDomain',
      'projectId',
      'storageBucket',
      'messagingSenderId',
      'appId',
    ] as const
    const missingKeys = requiredKeys.filter((key) => !firebaseConfig[key])

    if (missingKeys.length > 0) {
      throw new Error(`Missing required Firebase configuration: ${missingKeys.join(', ')}`)
    }

    config.firebase = firebaseConfig
  } else if (provider === 'gis') {
    const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string
    const scopes = import.meta.env.VITE_GOOGLE_SCOPES as string
    if (!clientId) {
      throw new Error(
        'Missing required Google Identity Services configuration: VITE_GOOGLE_CLIENT_ID',
      )
    }

    config.gis = { clientId, scopes }
  }

  return config
}

/**
 * Create and initialize the default authentication provider
 */
export async function createDefaultAuthProvider(): Promise<AuthProvider> {
  const config = getAuthConfigFromEnv()
  const provider = createAuthProvider(config)
  await provider.initialize()
  return provider
}
