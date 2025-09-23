<template>
  <div class="relative mx-auto flex max-w-[32rem] flex-col justify-center px-4 py-12">
    <div
      class="bg-primary-500/10 pointer-events-none absolute inset-x-0 top-6 mx-auto h-32 w-32 rounded-full blur-3xl"
    />

    <div
      class="relative rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-2xl backdrop-blur dark:border-gray-800 dark:bg-gray-900/60"
    >
      <div class="absolute top-4 right-4">
        <ThemeToggle :is-dark="isDark" @toggle="toggleTheme()" />
      </div>
      <div class="mb-6 flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-rose-600 text-white shadow"
        >
          <span aria-hidden="true">🎬</span>
        </div>
        <div>
          <h1 class="text-xl leading-6 font-semibold text-gray-900 dark:text-gray-100">
            Sign in to Admin
          </h1>
          <p class="text-sm text-gray-500 dark:text-gray-400">Access your workspace and tools</p>
        </div>
      </div>

      <form class="space-y-4" @submit.prevent="handleEmailLogin">
        <div class="relative">
          <span
            class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          >
            <IconEmail class="h-5 w-5" />
          </span>
          <input
            v-model="email"
            type="email"
            placeholder="Email"
            class="focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-600 dark:focus:ring-primary-600 w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-3 pl-10 text-gray-900 placeholder-gray-400 focus:ring-1 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            required
          />
        </div>

        <div class="relative">
          <span
            class="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          >
            <IconLock class="h-5 w-5" />
          </span>
          <input
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            placeholder="Password"
            class="focus:border-primary-500 focus:ring-primary-500 dark:focus:border-primary-600 dark:focus:ring-primary-600 w-full rounded-lg border border-gray-300 bg-white py-2.5 pr-10 pl-10 text-gray-900 placeholder-gray-400 focus:ring-1 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500"
            required
          />
          <button
            type="button"
            class="absolute top-1/2 right-3 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-400 dark:hover:text-gray-200"
            :aria-label="showPassword ? 'Hide password' : 'Show password'"
            @click="showPassword = !showPassword"
          >
            <IconEye v-if="!showPassword" class="h-5 w-5" />
            <IconEyeOff v-else class="h-5 w-5" />
          </button>
        </div>

        <div class="flex items-center justify-between text-sm">
          <label class="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <input
              v-model="remember"
              type="checkbox"
              class="text-primary-600 focus:ring-primary-600 h-4 w-4 rounded border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900"
            />
            <span>Remember me</span>
          </label>
          <a
            href="#"
            class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >Forgot password?</a
          >
        </div>

        <Button type="submit" variant="primary" size="lg" :loading="isLoading" full-width>
          Sign In
        </Button>
      </form>

      <div class="relative my-6">
        <hr class="border-gray-200 dark:border-gray-800" />
        <span
          class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white/80 px-2 text-xs tracking-wide text-gray-500 uppercase dark:bg-gray-900/60 dark:text-gray-400"
          >Or</span
        >
      </div>

      <Button
        variant="secondary"
        size="lg"
        icon="mdi:google"
        :disabled="isLoading"
        full-width
        @click="handleProvider('google')"
      >
        Continue with Google
      </Button>

      <p v-if="error" class="text-error-600 dark:text-error-300 mt-4 text-sm">
        {{ error }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useTheme } from '@/composables/useTheme'
import ThemeToggle from '@/components/atoms/ThemeToggle.vue'
import Button from '@/components/atoms/Button.vue'
import IconEmail from '~icons/mdi/email'
import IconLock from '~icons/mdi/lock'
import IconEye from '~icons/mdi/eye'
import IconEyeOff from '~icons/mdi/eye-off'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref('')
const showPassword = ref(false)
const { toggleTheme, isDark } = useTheme()
const remember = ref(true)

const handleProvider = async (provider: 'google' | 'github' | 'microsoft' | 'apple') => {
  try {
    isLoading.value = true
    error.value = ''
    console.log('🚀 Starting login with provider:', provider)
    const result = await authStore.loginWithProvider(provider)
    console.log('✅ Login result:', result)
    console.log('👤 Auth store user:', authStore.user)
    console.log('🔐 Is authenticated:', authStore.isAuthenticated)

    const redirectPath = (route.query.redirect as string) || '/'
    console.log('🔄 Redirecting to:', redirectPath)
    router.push(redirectPath)
  } catch (err) {
    console.error('❌ Login error:', err)
    error.value = err instanceof Error ? err.message : 'Login failed'
  } finally {
    isLoading.value = false
  }
}

const handleEmailLogin = async () => {
  try {
    isLoading.value = true
    error.value = ''
    await authStore.initialize()
    await authStore.clearError()
    // switch persistence based on remember
    try {
      ;(await import('@/composables/useAuth'))
        .useAuth()
        .setPersistenceMode(remember.value ? 'local' : 'session')
    } catch {
      void 0
    }
    await authStore.loginUser({ email: email.value, password: password.value })
    const redirectPath = (route.query.redirect as string) || '/'
    router.push(redirectPath)
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Login failed'
  } finally {
    isLoading.value = false
  }
}

onMounted(async () => {
  await authStore.initialize()
  if (authStore.isAuthenticated) {
    const redirectPath = (route.query.redirect as string) || '/'
    router.push(redirectPath)
  } else {
    // If not authenticated and no redirect parameter, add default redirect
    if (!route.query.redirect) {
      router.replace({ path: '/auth', query: { redirect: '/' } })
    }
  }
})
</script>
