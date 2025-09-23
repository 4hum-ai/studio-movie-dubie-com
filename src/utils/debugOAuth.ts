/**
 * OAuth Debug Utility
 * Helps identify the exact origin and OAuth configuration issues
 */

export function debugOAuth() {
  console.group('🔍 OAuth Debug Information')

  // Current URL information
  console.log('📍 Current URL:', window.location.href)
  console.log('🌐 Origin:', window.location.origin)
  console.log('🏠 Hostname:', window.location.hostname)
  console.log('🔌 Port:', window.location.port)
  console.log('📋 Protocol:', window.location.protocol)

  // Environment variables
  console.log('🔑 Auth Provider:', import.meta.env.VITE_AUTH_PROVIDER)
  console.log('🆔 Google Client ID:', import.meta.env.VITE_GOOGLE_CLIENT_ID)

  // Google Identity Services status
  console.log('🔧 Google Identity Services loaded:', !!window.google?.accounts?.id)

  // OAuth client configuration check
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (clientId) {
    console.log('✅ Client ID is configured')
    console.log('🆔 Client ID:', clientId)
  } else {
    console.error('❌ Client ID is not configured')
  }

  // Check if we're using the right provider
  const authProvider = import.meta.env.VITE_AUTH_PROVIDER
  if (authProvider === 'gis') {
    console.log('✅ Using Google Identity Services')

    // Check localStorage for auth state
    const storedUser = localStorage.getItem('gis_auth_user')
    const storedToken = localStorage.getItem('gis_auth_token')
    console.log('💾 Stored Auth State:')
    console.log('  - User:', storedUser ? 'Present' : 'None')
    console.log('  - Token:', storedToken ? 'Present' : 'None')

    if (storedUser) {
      try {
        const user = JSON.parse(storedUser)
        console.log('  - User Email:', user.email)
        console.log('  - User Name:', user.displayName)
      } catch {
        console.log('  - User Data: Invalid JSON')
      }
    }
  } else {
    console.warn('⚠️ Not using Google Identity Services. Current provider:', authProvider)
  }

  console.groupEnd()

  // Return the origin for easy copying
  return {
    origin: window.location.origin,
    clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID,
    authProvider: import.meta.env.VITE_AUTH_PROVIDER,
  }
}

// Make it available globally for debugging
if (typeof window !== 'undefined') {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(window as any).debugOAuth = debugOAuth
}
