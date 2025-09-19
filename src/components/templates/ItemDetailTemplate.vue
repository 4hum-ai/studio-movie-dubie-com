<template>
  <div class="min-h-screen">
    <AppBar :loading="loading" :show-back="Boolean(onBack)" @back="onBack && onBack()">
      <template #title>
        <slot name="app-bar-title" :item="item" :title="title">
          <slot name="title">
            {{ title }}
          </slot>
        </slot>
      </template>
      <template #subtitle>
        <slot name="app-bar-subtitle" :item="item" :subtitle="subtitle">
          <slot name="subtitle">
            {{ subtitle }}
          </slot>
        </slot>
      </template>
      <template #actions>
        <slot
          name="app-bar-actions"
          :item="item"
          :enable-edit="enableEdit"
          :action-menu-items="actionMenuItems"
          :handlers="{ edit: handleEdit, actionMenuSelect: handleActionMenuSelect }"
        >
          <Button v-if="enableEdit" variant="primary" size="sm" @click="handleEdit"> Edit </Button>
          <ActionsMenu :items="actionMenuItems" size="md" @select="handleActionMenuSelect" />
        </slot>
      </template>
    </AppBar>

    <!-- Spacer to offset the fixed app bar height -->
    <div class="h-16" />

    <!-- Navigation section -->
    <div v-if="!hideDefaultSections.includes('navigation')" class="px-4 py-2">
      <slot
        name="navigation"
        :item="item"
        :breadcrumbs="breadcrumbs"
        :handlers="{ goBack: onBack }"
      >
        <slot name="breadcrumbs" :items="breadcrumbs">
          <Breadcrumbs :items="breadcrumbs" />
        </slot>
      </slot>
    </div>

    <main class="p-4">
      <!-- Loading state -->
      <slot name="loading" :loading="loading" :detail-sections="detailSections" :item="item">
        <div v-if="loading" class="space-y-6">
          <div v-if="detailSections && detailSections.length" class="space-y-6">
            <section
              v-for="(section, sIdx) in detailSections"
              :key="`skeleton-sec-${sIdx}`"
              class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900"
            >
              <div
                v-if="section.title"
                class="rounded-t-lg border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <div class="h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
              <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                <div
                  v-for="i in section.fields?.length || 4"
                  :key="`skeleton-field-${sIdx}-${i}`"
                  class="flex flex-col gap-2"
                >
                  <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                  <div class="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                </div>
              </div>
            </section>
          </div>
          <div
            v-else
            class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div v-for="i in 8" :key="`skeleton-kv-${i}`" class="flex flex-col gap-2">
                <div class="h-3 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div class="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
          </div>
        </div>
      </slot>

      <!-- Error state -->
      <slot name="error" :error="error" :item="item" :handlers="{ retry: () => $emit('retry') }">
        <div v-if="error" class="text-error-600 dark:text-error-400 text-sm">
          {{ error }}
        </div>
      </slot>

      <!-- Empty state -->
      <slot name="empty-state" :item="item" :resource-name="resourceName" :ui-config="uiConfig">
        <div v-if="!item" class="py-12 text-center">
          <p class="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      </slot>

      <!-- Main content -->
      <div v-if="!loading && !error && item">
        <!-- Details header -->
        <slot
          name="details-header"
          :item="item"
          :resource-name="resourceName"
          :ui-config="uiConfig"
          :handlers="{ edit: handleEdit, delete: () => emit('delete') }"
        />

        <!-- Main details content -->
        <slot
          name="details"
          :item="item"
          :detail-sections="detailSections"
          :display-pairs="displayPairs"
          :handlers="{ referenceClick: handleReferenceClick }"
        >
          <!-- Use configured detailView when available -->
          <div v-if="detailSections && detailSections.length" class="space-y-6">
            <Card v-for="(section, sIdx) in detailSections" :key="`sec-${sIdx}`" variant="elevated">
              <div
                v-if="section.title"
                class="rounded-t-lg border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                  {{ section.title }}
                </h3>
              </div>
              <div class="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                <div v-for="field in section.fields || []" :key="field.key" class="flex flex-col">
                  <span class="text-xs text-gray-500 dark:text-gray-400">{{
                    field.label || formatKey(String(field.key))
                  }}</span>
                  <FieldValue
                    :value="item?.[field.key]"
                    :type="field.type"
                    :formatter="field.formatter"
                    :currency-code="currencyCode(item || {})"
                    :field-key="field.key"
                    :ref-to="field.refTo"
                    @reference-click="handleReferenceClick"
                  />
                </div>
              </div>
            </Card>
          </div>
          <!-- Fallback to naive key/value rendering in a single card -->
          <div
            v-else
            class="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900"
          >
            <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div v-for="(value, key) in displayPairs" :key="String(key)" class="flex flex-col">
                <span class="text-xs text-gray-500 dark:text-gray-400">{{
                  formatKey(String(key))
                }}</span>
                <span class="text-sm break-all text-gray-900 dark:text-gray-100">{{
                  formatValue(value)
                }}</span>
              </div>
            </div>
          </div>

          <!-- Related Media Section (fallback) -->
          <RelatedMediaSection
            v-if="item?.id"
            :entity-type="resourceName"
            :entity-id="String(item.id)"
            :show-upload-button="true"
            @media-click="(_, media) => emit('related-item-click', resourceName, String(media.id))"
          />
        </slot>

        <!-- Details footer -->
        <slot
          name="details-footer"
          :item="item"
          :resource-name="resourceName"
          :ui-config="uiConfig"
          :handlers="{ edit: handleEdit, delete: () => emit('delete') }"
        />

        <!-- Related Items Section -->
        <div
          v-if="
            !hideDefaultSections.includes('related-items') &&
            autoRelatedItemsConfig &&
            item?.id &&
            (hasRelatedItems || relatedItemsLoading || relatedItemsError)
          "
          class="mt-8"
        >
          <slot
            name="related-items"
            :item="item"
            :related-items="relatedItems"
            :related-items-loading="relatedItemsLoading"
            :related-items-error="relatedItemsError"
            :related-items-empty="relatedItemsEmpty"
            :grouped-by-resource-type="groupedByResourceType"
            :handlers="{ relatedItemClick: handleRelatedItemClick }"
          >
            <Card variant="elevated">
              <slot
                name="related-items-header"
                :item="item"
                :related-items-count="relatedItems.length"
              >
                <div
                  class="rounded-t-lg border-b border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">
                    Related Items
                  </h3>
                </div>
              </slot>

              <slot
                name="related-items-content"
                :item="item"
                :related-items="relatedItems"
                :related-items-loading="relatedItemsLoading"
                :related-items-error="relatedItemsError"
                :related-items-empty="relatedItemsEmpty"
                :grouped-by-resource-type="groupedByResourceType"
                :handlers="{ relatedItemClick: handleRelatedItemClick }"
              >
                <div class="p-4">
                  <!-- Loading state -->
                  <div v-if="relatedItemsLoading" class="space-y-3">
                    <div v-for="i in 3" :key="`skeleton-${i}`" class="flex items-center space-x-3">
                      <div class="h-8 w-8 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      <div class="flex-1 space-y-1">
                        <div class="h-4 w-3/4 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                        <div class="h-3 w-1/2 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                      </div>
                    </div>
                  </div>

                  <!-- Error state -->
                  <div v-else-if="relatedItemsError" class="text-sm text-red-600 dark:text-red-400">
                    {{ relatedItemsError }}
                  </div>

                  <!-- Empty state -->
                  <div
                    v-else-if="relatedItemsEmpty"
                    class="text-sm text-gray-500 dark:text-gray-400"
                  >
                    No related items found
                  </div>

                  <!-- Related items list -->
                  <div v-else class="space-y-4">
                    <!-- Group by resource type -->
                    <div v-if="Object.keys(groupedByResourceType).length > 1" class="space-y-6">
                      <div
                        v-for="(items, resourceType) in groupedByResourceType"
                        :key="resourceType"
                        class="space-y-3"
                      >
                        <!-- Resource type header -->
                        <div class="flex items-center space-x-2">
                          <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                          <h4
                            class="px-2 text-xs font-semibold tracking-wider text-gray-600 uppercase dark:text-gray-300"
                          >
                            {{ formatResourceType(resourceType) }}
                          </h4>
                          <div class="h-px flex-1 bg-gray-200 dark:bg-gray-700"></div>
                        </div>

                        <!-- Items for this resource type -->
                        <div class="space-y-2">
                          <div
                            v-for="item in items"
                            :key="`${item.resourceType}-${item.id}`"
                            class="flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                            @click="handleRelatedItemClick(item.resourceType, item.id)"
                          >
                            <!-- Resource type indicator badge -->
                            <div class="flex-shrink-0">
                              <span
                                class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                              >
                                {{ formatResourceType(item.resourceType).split(' ')[0] }}
                              </span>
                            </div>

                            <!-- Item avatar -->
                            <div
                              class="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 flex h-8 w-8 items-center justify-center rounded-full"
                            >
                              <span class="text-xs font-medium">{{
                                item.title.charAt(0).toUpperCase()
                              }}</span>
                            </div>

                            <!-- Item content -->
                            <div class="min-w-0 flex-1">
                              <p
                                class="truncate text-sm font-medium text-gray-900 dark:text-gray-100"
                              >
                                {{ item.title }}
                              </p>
                              <p
                                v-if="item.subtitle"
                                class="truncate text-xs text-gray-500 dark:text-gray-400"
                              >
                                {{ item.subtitle }}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Simple list if only one resource type -->
                    <div v-else class="space-y-2">
                      <div
                        v-for="item in relatedItems"
                        :key="`${item.resourceType}-${item.id}`"
                        class="flex cursor-pointer items-center space-x-3 rounded-lg border border-gray-200 p-3 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
                        @click="handleRelatedItemClick(item.resourceType, item.id)"
                      >
                        <!-- Resource type indicator badge -->
                        <div class="flex-shrink-0">
                          <span
                            class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {{ formatResourceType(item.resourceType).split(' ')[0] }}
                          </span>
                        </div>

                        <!-- Item avatar -->
                        <div
                          class="bg-primary-100 text-primary-600 dark:bg-primary-900 dark:text-primary-400 flex h-8 w-8 items-center justify-center rounded-full"
                        >
                          <span class="text-xs font-medium">{{
                            item.title.charAt(0).toUpperCase()
                          }}</span>
                        </div>

                        <!-- Item content -->
                        <div class="min-w-0 flex-1">
                          <p class="truncate text-sm font-medium text-gray-900 dark:text-gray-100">
                            {{ item.title }}
                          </p>
                          <p
                            v-if="item.subtitle"
                            class="truncate text-xs text-gray-500 dark:text-gray-400"
                          >
                            {{ item.subtitle }}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </slot>
            </Card>
          </slot>
        </div>

        <!-- Additional metadata section -->
        <slot name="metadata" :item="item" :resource-name="resourceName" :ui-config="uiConfig" />

        <!-- Custom actions section -->
        <slot
          name="actions"
          :item="item"
          :resource-name="resourceName"
          :ui-config="uiConfig"
          :handlers="{ edit: handleEdit, delete: () => emit('delete') }"
        />
      </div>
    </main>

    <!-- Custom sidebar -->
    <slot
      name="sidebar"
      :item="item"
      :resource-name="resourceName"
      :ui-config="uiConfig"
      :handlers="{ edit: handleEdit, delete: () => emit('delete') }"
    >
      <slot
        name="sidebar-header"
        :item="item"
        :resource-name="resourceName"
        :ui-config="uiConfig"
      />
      <slot
        name="sidebar-content"
        :item="item"
        :resource-name="resourceName"
        :ui-config="uiConfig"
      />
      <slot
        name="sidebar-footer"
        :item="item"
        :resource-name="resourceName"
        :ui-config="uiConfig"
      />
    </slot>
    <DynamicFormSidebar
      v-if="showFormSidebar"
      :title="formSidebarTitle"
      :form-config="uiConfig?.formView"
      :initial-data="formSidebarData"
      :loading="formSidebarLoading"
      :submit-text="formSidebarSubmitText"
      :loading-text="formSidebarLoadingText"
      @close="closeFormSidebar"
      @submit="handleFormSubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Breadcrumbs, { BreadcrumbItem } from '@/components/molecules/Breadcrumbs.vue'
import FieldValue from '@/components/atoms/FieldValue.vue'
import DynamicFormSidebar from '@/components/molecules/DynamicFormSidebar.vue'
import ActionsMenu from '@/components/atoms/ActionsMenu.vue'
import AppBar from '@/components/molecules/AppBar.vue'
import Card from '@/components/atoms/Card.vue'
import RelatedMediaSection from '@/components/organisms/RelatedMediaSection.vue'
import Button from '@/components/atoms/Button.vue'
import { UiConfig } from '@/types/ui-config'
import { useRelatedItems, type RelatedItemsConfig } from '@/composables/useRelatedItems'
import { useResourceService } from '@/composables/useResourceService'

interface RelatedItem {
  /** The resource type (e.g., 'media-relationships', 'titles') */
  resourceType: string
  /** The ID of the related item */
  id: string
  /** The display name/title of the related item */
  title: string
  /** Optional subtitle/description */
  subtitle?: string
  /** The relationship type (e.g., 'belongs_to', 'references') */
  relationshipType?: string
  /** Additional metadata */
  metadata?: Record<string, unknown>
}

interface Props {
  resourceName: string
  item?: Record<string, unknown> | null
  loading?: boolean
  error?: string | null
  enableEdit?: boolean
  enableDelete?: boolean
  onBack?: () => void
  uiConfig: UiConfig | null
  customEditHandler?: boolean
  hideDefaultSections?: string[]
  customLayout?: boolean
  sectionOrder?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  item: null,
  loading: false,
  error: null,
  enableEdit: true,
  enableDelete: true,
  hideDefaultSections: () => [],
  customLayout: false,
  sectionOrder: () => [],
})

const emit = defineEmits([
  'edit',
  'delete',
  'update',
  'reference-click',
  'related-item-click',
  'retry',
])

const title = computed(() => props.item?.name || props.item?.title || 'Details')
const subtitle = computed(() => props.item?.id)

const displayPairs = computed(() => props.item || {})

const breadcrumbs = computed((): BreadcrumbItem[] => [
  { label: 'Dashboard', to: '/' },
  { label: props.uiConfig?.displayName || '', to: `/${props.resourceName}` },
  { label: String(title.value) },
])

const formatKey = (k: string) =>
  k
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase())

const formatValue = (v: unknown) => {
  if (v === null || v === undefined) return '-'
  if (typeof v === 'object') return JSON.stringify(v)
  return String(v)
}

const detailSections = computed(() => props.uiConfig?.detailView?.sections || [])
const currencyCode = (obj: Record<string, unknown>): string | undefined => {
  const code = obj?.currency
  return typeof code === 'string' && code.length >= 3 ? code : undefined
}

// Auto-generate related items configuration by scanning all UI configs
const autoRelatedItemsConfig = useRelatedItems(props.resourceName)

// Debug logging
watch(
  autoRelatedItemsConfig,
  (config) => {
    console.log('🔧 Auto related items config changed:', config)
  },
  { immediate: true },
)

watch(
  () => props.item?.id,
  (itemId) => {
    console.log('📄 Item ID changed:', itemId)
  },
  { immediate: true },
)

watch(
  () => props.resourceName,
  (resourceName) => {
    console.log('🏷️ Resource name changed:', resourceName)
  },
  { immediate: true },
)

watch(
  () => props.uiConfig,
  (uiConfig) => {
    console.log('📋 UI Config changed:', uiConfig)
    if (uiConfig?.detailView) {
      console.log('📋 Detail view sections:', uiConfig.detailView.sections)
      const refFields = uiConfig.detailView.sections
        ?.flatMap((section) => section.fields || [])
        .filter((field) => field.type === 'ref' && field.refTo)
      console.log('🔗 Ref fields found:', refFields)
    }
  },
  { immediate: true },
)

// Related items functionality (inlined from RelatedItemsSection)
const resourceService = useResourceService()
const { list, isLoading: resourceLoading } = resourceService

// Local state for related items
const relatedItems = ref<RelatedItem[]>([])
const relatedItemsError = ref<string | null>(null)

// Computed properties for related items
const hasRelatedItems = computed(() => relatedItems.value.length > 0)
const relatedItemsLoading = computed(() => resourceLoading.value)
const relatedItemsEmpty = computed(
  () => !relatedItemsLoading.value && relatedItems.value.length === 0,
)

// Group related items by resource type
const groupedByResourceType = computed(() => {
  const groups: Record<string, RelatedItem[]> = {}

  relatedItems.value.forEach((item) => {
    const key = item.resourceType || 'other'
    if (!groups[key]) {
      groups[key] = []
    }
    groups[key].push(item)
  })

  return groups
})

// Format resource type for display
const formatResourceType = (type: string) => {
  return type
    .replace(/-/g, ' ')
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (s) => s.toUpperCase())
    .replace(/\b\w/g, (l) => l.toUpperCase())
}

// Fetch related items when entity changes
watch(
  () => [props.item?.id, props.resourceName, autoRelatedItemsConfig.value],
  async ([itemId, resourceType, config]) => {
    console.log('👀 Watch triggered:', { itemId, resourceType, config })
    if (itemId && config) {
      await fetchRelatedItems(String(itemId), String(resourceType), config as RelatedItemsConfig)
    } else {
      console.log('❌ Watch condition not met:', { itemId: !!itemId, config: !!config })
    }
  },
  { immediate: true },
)

// Fetch related items using the existing resource service
const fetchRelatedItems = async (
  entityId: string,
  entityType: string,
  config: RelatedItemsConfig,
) => {
  if (!entityId) return

  relatedItemsError.value = null

  try {
    // Build query to find relationships
    const query: Record<string, unknown> = {
      page: 1,
      limit: 100, // Get all related items for now
    }
    query[`filters[${config.referenceField}]`] = entityId

    console.log('🔍 Fetching related items:', {
      entityId,
      entityType,
      config,
      query,
      resource: config.relationshipResource,
    })

    const result = await list(config.relationshipResource, query)

    console.log('📦 Related items result:', result)

    // Transform the results into RelatedItem format
    relatedItems.value = result.data.map((item: Record<string, unknown>) => {
      const relatedItem: RelatedItem = {
        resourceType: config.relationshipResource,
        id: String(item.id || ''),
        title: String(item[config.titleField || 'id'] || 'Unknown'),
        subtitle: config.subtitleField ? String(item[config.subtitleField] || '') : undefined,
        relationshipType: config.relationshipTypeField
          ? String(item[config.relationshipTypeField] || '')
          : undefined,
        metadata: item,
      }

      // If we have entity type and ID fields, use them to determine the actual related resource
      if (config.entityTypeField && config.entityIdField) {
        const entityType = item[config.entityTypeField]
        const entityId = item[config.entityIdField]

        if (entityType && entityId) {
          relatedItem.resourceType = String(entityType)
          relatedItem.id = String(entityId)
          // Try to get a better title from the related entity
          relatedItem.title = String(item[config.titleField || 'title'] || entityId)
        }
      }

      return relatedItem
    })
  } catch (err) {
    relatedItemsError.value = err instanceof Error ? err.message : 'Failed to fetch related items'
    console.error('Error fetching related items:', err)
  }
}

// Actions menu items (e.g., Delete lives here now)
type ActionMenuItem = { key: string; label: string; description?: string }
const actionMenuItems = computed<ActionMenuItem[]>(() => {
  const items: ActionMenuItem[] = []
  if (props.enableDelete) items.push({ key: 'delete', label: 'Delete' })
  return items
})

// Edit sidebar state
const showFormSidebar = ref(false)
const formSidebarTitle = ref('')
const formSidebarData = ref<Record<string, unknown>>({})
const formSidebarLoading = ref(false)
const formSidebarSubmitText = ref('Save changes')
const formSidebarLoadingText = ref('Saving...')

function handleEdit() {
  if (props.customEditHandler) {
    emit('edit')
    return
  }
  formSidebarTitle.value = `Edit ${props.uiConfig?.displayName?.slice(0, -1) || 'Item'}`
  formSidebarSubmitText.value = 'Save changes'
  formSidebarLoadingText.value = 'Saving...'
  formSidebarData.value = { ...(props.item || {}) }
  showFormSidebar.value = true
}

function closeFormSidebar() {
  showFormSidebar.value = false
  formSidebarData.value = {}
}

function handleFormSubmit(data: Record<string, unknown>) {
  emit('update', data)
  closeFormSidebar()
}

function handleActionMenuSelect(key: string) {
  if (key === 'delete') emit('delete')
}

function handleReferenceClick(referenceType: string, referenceId: string) {
  emit('reference-click', referenceType, referenceId)
}

function handleRelatedItemClick(resourceType: string, itemId: string) {
  emit('related-item-click', resourceType, itemId)
}
</script>
