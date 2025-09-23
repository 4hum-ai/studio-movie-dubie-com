import { initializeApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  GithubAuthProvider,
  OAuthProvider,
  signInWithPopup,
  getAdditionalUserInfo,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User as FirebaseUser,
} from 'firebase/auth'
import type { AuthProvider, AuthUser } from '@/types/auth'

/**
 * Firebase Authentication Provider
 * Implements the AuthProvider interface using Firebase Auth
 */
export class FirebaseAuthProvider implements AuthProvider {
  private app: FirebaseApp | null = null
  private authInstance: ReturnType<typeof getAuth> | null = null
  private config: {
    apiKey: string
    authDomain: string
    projectId: string
    storageBucket: string
    messagingSenderId: string
    appId: string
  }

  constructor(config: {
    apiKey: string
    authDomain: string
    projectId: string
    storageBucket: string
    messagingSenderId: string
    appId: string
  }) {
    this.config = config
  }

  private ensureAuthInitialized() {
    if (!this.app) {
      this.app = initializeApp(this.config)
    }
    if (!this.authInstance) {
      this.authInstance = getAuth(this.app)
      void setPersistence(this.authInstance, browserLocalPersistence).catch(() => {})
    }
    return this.authInstance
  }

  private convertFirebaseUser(firebaseUser: FirebaseUser): AuthUser {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || undefined,
      photoURL: firebaseUser.photoURL || undefined,
    }
  }

  async initialize(): Promise<void> {
    // Firebase initializes lazily when first accessed
    this.ensureAuthInitialized()
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const auth = this.ensureAuthInitialized()
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
        if (firebaseUser) {
          const converted = this.convertFirebaseUser(firebaseUser)
          resolve(converted)
        } else {
          resolve(null)
        }
        unsubscribe()
      })
    })
  }

  subscribe(callback: (user: AuthUser | null) => void): () => void {
    const auth = this.ensureAuthInitialized()
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const converted = firebaseUser ? this.convertFirebaseUser(firebaseUser) : null
      callback(converted)
    })
    return unsubscribe
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const auth = this.ensureAuthInitialized()
    const cred = await signInWithEmailAndPassword(auth, email, password)
    return this.convertFirebaseUser(cred.user)
  }

  async loginWithGoogle(): Promise<{ user: AuthUser; newUser?: boolean }> {
    const auth = this.ensureAuthInitialized()
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const converted = this.convertFirebaseUser(result.user)
    const info = getAdditionalUserInfo(result)
    return { user: converted, newUser: info?.isNewUser }
  }

  async loginWithOAuth(
    providerName: 'google' | 'github' | 'microsoft' | 'apple',
  ): Promise<{ user: AuthUser; newUser?: boolean }> {
    const auth = this.ensureAuthInitialized()
    let providerInstance: GoogleAuthProvider | GithubAuthProvider | OAuthProvider

    switch (providerName) {
      case 'google':
        providerInstance = new GoogleAuthProvider()
        break
      case 'github':
        providerInstance = new GithubAuthProvider()
        break
      case 'microsoft':
        providerInstance = new OAuthProvider('microsoft.com')
        break
      case 'apple':
        providerInstance = new OAuthProvider('apple.com')
        break
    }

    const result = await signInWithPopup(auth, providerInstance)
    const converted = this.convertFirebaseUser(result.user)
    const info = getAdditionalUserInfo(result)
    return { user: converted, newUser: info?.isNewUser }
  }

  async logout(): Promise<void> {
    const auth = this.ensureAuthInitialized()
    await signOut(auth)
  }

  async setPersistenceMode(mode: 'local' | 'session'): Promise<void> {
    const auth = this.ensureAuthInitialized()
    const persistence = mode === 'local' ? browserLocalPersistence : browserSessionPersistence
    await setPersistence(auth, persistence).catch(() => {})
  }

  async getIdToken(forceRefresh = false): Promise<string | null> {
    const auth = this.ensureAuthInitialized()
    const user = auth.currentUser
    if (!user) return null

    try {
      return await user.getIdToken(forceRefresh)
    } catch (error) {
      console.error('Failed to get ID token:', error)
      return null
    }
  }
}
