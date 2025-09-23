/// <reference types="vite/client" />

// Google Identity Services types
interface GoogleAccounts {
  accounts: {
    id: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialize: (config: any) => void
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      prompt: (callback?: (notification: any) => void) => void
      disableAutoSelect: () => void
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      callback?: (response: any) => void
    }
    oauth2: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initTokenClient: (config: any) => {
        requestAccessToken: () => void
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initCodeClient: (config: any) => {
        requestCode: () => void
      }
    }
  }
}

interface Window {
  google?: GoogleAccounts
}

interface ImportMetaEnv {
  readonly VITE_PUBLIC_API_URL: string
  readonly VITE_FIREBASE_API_KEY: string
  readonly VITE_FIREBASE_AUTH_DOMAIN: string
  readonly VITE_FIREBASE_PROJECT_ID: string
  readonly VITE_FIREBASE_STORAGE_BUCKET: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string
  readonly VITE_FIREBASE_APP_ID: string
  readonly VITE_GOOGLE_CLIENT_ID?: string
  readonly VITE_AUTH_PROVIDER?: string
  readonly VITE_GOOGLE_CLOUD_PROJECT?: string
  readonly VITE_GOOGLE_CLOUD_LOCATION?: string
  readonly VITE_ADMIN_UI_CONFIG_FROM_LOCAL?: string
  readonly VITE_ADMIN_UI_CONFIG_LOCAL_PATH?: string
  readonly VITE_CLOUDFLARE_DOMAIN?: string
  readonly VITE_ENABLE_CDN?: string
  readonly VITE_ENABLE_IMAGE_TRANSFORMATIONS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
