<template>
  <ItemDetailTemplate
    resource-name="titles"
    :item="item"
    :loading="loading"
    :error="error"
    :ui-config="uiConfig"
    :on-back="goBack"
    @update="onUpdate"
    @edit="onEdit"
    @delete="onDelete"
    @reference-click="onReferenceClick"
    @related-item-click="onRelatedItemClick"
  />
  <ConfirmModal
    :open="confirmOpen"
    title="Delete title"
    message="Delete this title? This cannot be undone."
    confirm-label="Delete"
    @confirm="confirmDelete"
    @cancel="confirmOpen = false"
  />
</template>

<script setup lang="ts">
defineOptions({ name: 'TitleDetail' })
import { ref, computed, watch, onBeforeUnmount, onActivated, onDeactivated, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ItemDetailTemplate from '@/components/templates/ItemDetailTemplate.vue'
import { useResourceService } from '@/composables/useResourceService'
import { useUiConfig } from '@/composables/useUiConfig'
import ConfirmModal from '@/components/molecules/ConfirmModal.vue'
import { useActivity } from '@/composables/useActivity'
import { useStaleStore } from '@/stores/stale'
import type { UiConfig } from '@/types/ui-config'

interface ItemData extends Record<string, unknown> {
  id?: string | number
  _id?: string | number
}

const api = useResourceService()
const activity = useActivity()
const route = useRoute()
const router = useRouter()
const stale = useStaleStore()

const id = computed(() => String(route.params.id || route.params._id || route.params.slug || ''))

const item = ref<Record<string, unknown> | null>(null)
const { get: getUiConfig, state: uiState } = useUiConfig()
const uiConfig = ref<UiConfig | null>(null)
const loading = ref(false)
const error = ref<string | null>(null)
let currentAbort: AbortController | null = null
const confirmOpen = ref(false)
const isActive = ref(false)
const lastLoadedId = ref<string | null>(null)

async function load() {
  if (!id.value) return
  loading.value = true
  error.value = null
  try {
    if (!uiConfig.value) {
      currentAbort?.abort()
      currentAbort = new AbortController()
      uiConfig.value = await getUiConfig('titles', { signal: currentAbort.signal })
      if (!uiConfig.value && !uiState.initialized) {
        // Initialize configs if not yet loaded
        const { init } = useUiConfig()
        await init({ force: true })
        uiConfig.value = await getUiConfig('titles', { signal: currentAbort.signal })
      }
    }
    currentAbort?.abort()
    currentAbort = new AbortController()
    let res: unknown
    try {
      res = await api.getById('titles', id.value, currentAbort.signal)
    } catch {
      // If API requires slug filter, try list with filters as fallback
      const alt = await api.list(
        'titles',
        { page: 1, limit: 1, filters: { slug: id.value } },
        currentAbort.signal,
      )
      res = (alt.data && alt.data[0]) || null
    }
    item.value = res as ItemData
    lastLoadedId.value = id.value
    try {
      activity.recordVisit({ resource: 'titles', id: id.value, data: res })
    } catch {
      /* ignore */
    }
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'Failed to load title'
  } finally {
    loading.value = false
  }
}

function goBack() {
  router.back()
}

function onEdit() {
  /* handled by ItemDetailTemplate edit sidebar */
}

async function onDelete() {
  if (!id.value) return
  confirmOpen.value = true
}

async function confirmDelete() {
  if (!id.value) return
  loading.value = true
  error.value = null
  try {
    currentAbort?.abort()
    currentAbort = new AbortController()
    await api.remove('titles', id.value, currentAbort.signal)
    stale.mark('path:/titles')
    router.push({ path: '/titles' })
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'Delete failed'
  } finally {
    loading.value = false
    confirmOpen.value = false
  }
}

async function onUpdate(data: Record<string, unknown>) {
  if (!id.value) return
  loading.value = true
  error.value = null
  try {
    currentAbort?.abort()
    currentAbort = new AbortController()
    await api.update('titles', id.value, data, currentAbort.signal)
    stale.mark('path:/titles')
    await load()
  } catch (e: unknown) {
    error.value = (e as Error)?.message || 'Update failed'
  } finally {
    loading.value = false
  }
}

function onReferenceClick(referenceType: string, referenceId: string) {
  router.push(`/${referenceType}/${referenceId}`)
}

function onRelatedItemClick(_resourceType: string, itemId: string) {
  // Mark parameter as intentionally unused to satisfy strict TS settings
  void _resourceType
  // Overwrite MEDIA item behavior: route to the editor under current title id.
  router.push(`/titles/${id.value}/media/${itemId}/editor`)
}

onActivated(() => {
  isActive.value = true
  if (!id.value) return
  if (lastLoadedId.value !== id.value || !item.value) {
    load()
  }
})

onDeactivated(() => {
  isActive.value = false
})

onMounted(() => {
  // Ensure initial load even when this view is not wrapped in KeepAlive include
  isActive.value = true
  if (id.value) load()
})

watch(id, () => {
  if (!isActive.value) return
  if (!id.value) return
  load()
})

onBeforeUnmount(() => {
  currentAbort?.abort()
})
</script>
