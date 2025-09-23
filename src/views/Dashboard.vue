<template>
  <div>
    <AppBar :loading="loadingCounts">
      <template #title> Hi, {{ auth.user?.displayName || auth.user?.email || 'there' }} </template>
      <template #subtitle> You are logged in as {{ auth.user?.email || '—' }} </template>
      <template #actions>
        <div class="flex flex-wrap items-center gap-3 sm:flex-nowrap">
          <div class="w-full sm:w-64">
            <label class="sr-only" for="resource-search">Search resources</label>
            <SearchInput id="resource-search" v-model="filter" placeholder="Search resources…" />
          </div>
          <ActionsMenu :items="menuItems" @select="onMenuSelect" />
        </div>
      </template>
    </AppBar>
    <div class="h-16" />
    <main class="p-6">
      <section v-if="isLoading" class="mt-6">
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div
            v-for="i in 6"
            :key="i"
            class="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="flex animate-pulse items-start gap-3">
              <div class="h-10 w-10 flex-none rounded-md bg-gray-200 dark:bg-gray-700" />
              <div class="flex-1 space-y-2">
                <div class="h-4 w-2/3 rounded bg-gray-200 dark:bg-gray-700" />
                <div class="h-3 w-full rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section v-else-if="visibleResources.length === 0" class="mt-6">
        <div
          class="rounded-lg border border-gray-200 bg-white p-6 text-center text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
        >
          <div
            class="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700"
          >
            <IconMagnify class="h-5 w-5 text-gray-400 dark:text-gray-300" />
          </div>
          <div v-if="filter">No resources match “{{ filter }}”.</div>
          <div v-else>No resources available.</div>
        </div>
      </section>

      <section v-else>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <router-link
            v-for="m in visibleResources"
            :key="m.name"
            :to="`/${m.name}`"
            class="block rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 dark:shadow-none dark:hover:shadow-md"
          >
            <div class="flex items-start justify-between gap-3">
              <div class="flex items-start gap-3">
                <div class="h-10 w-10 flex-none overflow-hidden">
                  <div class="grid h-full w-full place-items-center">
                    <Icon
                      v-if="m.icon"
                      :name="m.icon"
                      class="text-primary-600 dark:text-primary-400 h-6 w-6"
                    />
                    <Avatar
                      v-else
                      :label="m.displayName || toTitle(m.name)"
                      :seed="m.name"
                      shape="square"
                    />
                  </div>
                </div>
                <div>
                  <h3 class="text-base font-semibold text-gray-900 dark:text-gray-100">
                    {{ m.displayName || toTitle(m.name) }}
                  </h3>
                  <p v-if="m.description" class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {{ m.description }}
                  </p>
                </div>
              </div>
              <div class="text-right">
                <div v-if="countsLoading[m.name]" class="flex h-7 items-center justify-end">
                  <LoadingIcon
                    class="h-5 w-5 animate-spin text-gray-400 dark:text-gray-300"
                    aria-hidden="true"
                  />
                </div>
                <div v-else class="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {{ formatCount(counts[m.name]) }}
                </div>
                <div class="text-xs text-gray-500 dark:text-gray-400">Total</div>
              </div>
            </div>
          </router-link>
        </div>
      </section>

      <section class="mt-10 space-y-6">
        <div class="grid gap-4 lg:grid-cols-2">
          <div
            class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Recent visits
            </h2>
            <div v-if="recentVisits.length === 0" class="text-sm text-gray-500 dark:text-gray-400">
              No recent visits yet.
            </div>
            <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
              <li
                v-for="v in recentVisits"
                :key="`${v.resource}:${v.id}`"
                class="flex items-center justify-between gap-3 py-2"
              >
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    {{ labelFor(v.resource, v.data) }}
                  </div>
                  <div class="truncate text-xs text-gray-500 dark:text-gray-400">
                    {{ v.resource }} • {{ formatTimeAgo(v.lastVisited) }} • {{ v.count }}×
                  </div>
                </div>
                <button
                  class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
                  @click="openItem(v.resource, v.id)"
                >
                  Open
                </button>
              </li>
            </ul>
          </div>

          <div
            class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
          >
            <h2 class="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Recent activities
            </h2>
            <div
              v-if="recentActivities.length === 0"
              class="text-sm text-gray-500 dark:text-gray-400"
            >
              No recent activities yet.
            </div>
            <ul v-else class="divide-y divide-gray-200 dark:divide-gray-700">
              <li
                v-for="a in recentActivities"
                :key="`${a.resource}:${a.id}:${a.at}`"
                class="flex items-center justify-between gap-3 py-2"
              >
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                    <span
                      :class="[
                        'mr-2 inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium',
                        actionBadgeClass(a.action),
                      ]"
                      >{{ a.action }}</span
                    >
                    {{ labelFor(a.resource, a.afterData || a.beforeData) }}
                  </div>
                  <div class="truncate text-xs text-gray-500 dark:text-gray-400">
                    {{ a.resource }} • {{ formatTimeAgo(a.at) }}
                  </div>
                </div>
                <button
                  class="rounded border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-gray-700"
                  @click="onRevert(a)"
                >
                  Revert
                </button>
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'Dashboard' })
import { onMounted, onBeforeUnmount, ref, computed } from 'vue'
import ActionsMenu from '@/components/atoms/ActionsMenu.vue'
import AppBar from '@/components/molecules/AppBar.vue'
import Avatar from '@/components/atoms/Avatar.vue'
import Icon from '@/components/atoms/Icon.vue'
import SearchInput from '@/components/atoms/SearchInput.vue'
import { useResourceService } from '@/composables/useResourceService'
import { useUiConfig, type AdminResourceInfo } from '@/composables/useUiConfig'
import { useAuthStore } from '@/stores/auth'
import { useRouter } from 'vue-router'
import { useTheme } from '@/composables/useTheme'
import LoadingIcon from '~icons/mdi/loading'
import IconMagnify from '~icons/mdi/magnify'
import { ActivityEntry, useActivity, VisitEntry } from '@/composables/useActivity'
import { useEventBus } from '@vueuse/core'
import { EVENT_ACTIVITIES_UPDATED, EVENT_VISITS_UPDATED } from '@/types/events'
import { ColumnConfig, UiConfig } from '@/types/ui-config'
import { DataItem } from '@/types/common'

// Connection health check removed as it's low value for UX
const api = useResourceService()
const uiConfig = useUiConfig()
const auth = useAuthStore()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()
const activity = useActivity()
const visitsBus = useEventBus<null>(EVENT_VISITS_UPDATED)
const activitiesBus = useEventBus<null>(EVENT_ACTIVITIES_UPDATED)
let offVisits: (() => void) | null = null
let offActivities: (() => void) | null = null

const counts = ref<Record<string, number | null>>({})
const countsLoading = ref<Record<string, boolean>>({})
const adminResources = ref<AdminResourceInfo[]>([])
const loadingCounts = ref(false)
const loadingResources = ref(true)
const filter = ref('')
const isLoading = computed(() => loadingResources.value)

const toTitle = (value: string): string => {
  const base = value.replace(/^\//, '').replace(/-/g, ' ')
  return base.charAt(0).toUpperCase() + base.slice(1)
}

const formatCount = (n: number | null | undefined): string => {
  if (n === null || n === undefined) return '—'
  return new Intl.NumberFormat().format(n)
}

const visibleResources = computed(() => {
  const q = filter.value.trim().toLowerCase()
  const mods = q
    ? adminResources.value.filter((m) => {
        const name = (m.displayName || m.name).toLowerCase()
        const desc = (m.description || '').toLowerCase()
        return name.includes(q) || desc.includes(q)
      })
    : adminResources.value.slice()

  return mods.sort((a, b) => {
    const an = (a.displayName || a.name).toLowerCase()
    const bn = (b.displayName || b.name).toLowerCase()
    return an.localeCompare(bn)
  })
})

const loadCounts = async () => {
  loadingCounts.value = true
  try {
    if (adminResources.value.length === 0) {
      try {
        adminResources.value = await uiConfig.listResources()
      } catch {
        adminResources.value = []
      }
    }
    const mods = adminResources.value.map((m) => m.name)
    // Prime placeholders
    const seed: Record<string, number | null> = {}
    mods.forEach((m) => (seed[m] = null))
    counts.value = seed
    const loadingSeed: Record<string, boolean> = {}
    mods.forEach((m) => (loadingSeed[m] = true))
    countsLoading.value = loadingSeed
    // Limit concurrency to avoid overwhelming API if many resources
    const queue = mods.slice()
    const workers = Array.from({ length: 4 }).map(async () => {
      while (queue.length) {
        const mod = queue.shift()!
        try {
          const res = await api.list(mod, { page: 1, limit: 1 })
          counts.value[mod] = res.pagination.total
        } catch {
          counts.value[mod] = null
        } finally {
          countsLoading.value[mod] = false
        }
      }
    })
    await Promise.all(workers)
  } finally {
    loadingCounts.value = false
  }
}

// No connection check

const menuItems = computed(() => [
  {
    key: 'refresh-stats',
    label: loadingCounts.value ? 'Refreshing…' : 'Refresh Stats',
  },
  {
    key: 'reload-ui-config',
    label: 'Reload UI Config',
  },
  {
    key: 'toggle-theme',
    label: isDark.value ? 'Switch to Light' : 'Switch to Dark',
  },
  { key: 'logout', label: 'Logout' },
])

const onMenuSelect = async (key: string) => {
  if (key === 'refresh-stats') {
    await loadCounts()
  } else if (key === 'reload-ui-config') {
    uiConfig.clearCache()
    await uiConfig.init({ force: true })
    await loadCounts()
  } else if (key === 'toggle-theme') {
    toggleTheme()
  } else if (key === 'logout') {
    await auth.logoutUser()
    await router.push({ name: 'Auth', query: { redirect: '/' } })
  }
}

onMounted(async () => {
  loadingResources.value = true
  try {
    adminResources.value = await uiConfig.listResources()
  } catch {
    adminResources.value = []
  } finally {
    loadingResources.value = false
  }
  await loadCounts()
  refreshActivityLists()
  try {
    offVisits = visitsBus.on(() => refreshActivityLists())
    offActivities = activitiesBus.on(() => refreshActivityLists())
  } catch {
    /* ignore */
  }
})

onBeforeUnmount(() => {
  if (offVisits) offVisits()
  if (offActivities) offActivities()
})

// Visual helpers moved to Avatar atom
// Activity and label helpers
const recentVisits = ref<VisitEntry<DataItem>[]>([])
const recentActivities = ref<ActivityEntry<DataItem>[]>([])
const limit =
  Number((import.meta as { env?: Record<string, unknown> }).env?.VITE_DASHBOARD_ACTIVITY_LIMIT) ||
  10

function refreshActivityLists() {
  try {
    recentVisits.value = activity.getRecentVisits(limit) as VisitEntry<DataItem>[]
    recentActivities.value = activity.getRecentActivities(limit) as ActivityEntry<DataItem>[]
  } catch {
    recentVisits.value = []
    recentActivities.value = []
  }
}

function openItem(module: string, id: string) {
  router.push({ path: `/${module}/${id}` }).catch(() => {})
}

function formatTimeAgo(ts: number): string {
  const diff = Date.now() - ts
  const s = Math.floor(diff / 1000)
  if (s < 60) return `${s}s ago`
  const m = Math.floor(s / 60)
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  return `${d}d ago`
}

function actionBadgeClass(action: string): string {
  if (action === 'create') return 'bg-green-50 text-green-700 border border-green-200'
  if (action === 'update') return 'bg-yellow-50 text-yellow-700 border border-yellow-200'
  if (action === 'delete') return 'bg-red-50 text-red-700 border border-red-200'
  return 'bg-gray-50 text-gray-700 border border-gray-200'
}

async function onRevert(a: ActivityEntry<DataItem>) {
  try {
    await activity.revert(a)
    refreshActivityLists()
  } catch {
    /* ignore */
  }
}

function labelFor(resourceName: string, data: DataItem | undefined): string {
  if (!data || typeof data !== 'object') return String(data ?? '-')
  const cfg = (useUiConfig() as { state?: { configs?: Record<string, unknown> } }).state?.configs?.[
    resourceName
  ] as UiConfig
  const pick = (key?: string) => (key && data[key] ? String(data[key]) : '')
  // Try known config keys
  const fromGallery = pick(cfg?.views?.gallery?.titleField)
  if (fromGallery) return fromGallery
  const fromKanban = pick(cfg?.views?.kanban?.cardTitleField)
  if (fromKanban) return fromKanban
  const fromCalendar = pick(cfg?.views?.calendar?.titleField)
  if (fromCalendar) return fromCalendar
  // Try list column with titleField set
  const columns = (cfg?.views?.list?.columns || []) as ColumnConfig[]
  for (const c of columns) {
    const t = pick(c?.titleField) || pick(c?.key)
    if (t) return t
  }
  // Common fallbacks
  return (data?.name ||
    data?.title ||
    data?.displayName ||
    data?.email ||
    data?.id ||
    data?._id ||
    '-') as string
}
</script>
