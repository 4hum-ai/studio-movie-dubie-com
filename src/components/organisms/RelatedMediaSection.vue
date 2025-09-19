<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">Related Media</h3>
      <Button v-if="showUploadButton" variant="primary" size="sm" @click="showUploadModal = true">
        Upload Media
      </Button>
    </div>

    <!-- Loading state -->
    <div v-if="loading" class="py-4 text-center">
      <div class="inline-flex items-center">
        <div class="border-primary-600 mr-2 h-4 w-4 animate-spin rounded-full border-b-2"></div>
        Loading related media...
      </div>
    </div>

    <!-- Error state -->
    <div v-else-if="error" class="rounded-md bg-red-50 p-4 dark:bg-red-900/20">
      <p class="text-sm text-red-700 dark:text-red-400">{{ error }}</p>
    </div>

    <!-- Media grid -->
    <div
      v-else-if="relatedMedia.length > 0"
      class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6 xl:grid-cols-4"
    >
      <div
        v-for="media in relatedMedia"
        :key="media.id"
        class="cursor-pointer overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-sm dark:border-gray-700 dark:bg-gray-900"
        @click="handleMediaClick(media)"
      >
        <div
          class="relative flex aspect-square items-center justify-center bg-gray-100 dark:bg-gray-800"
        >
          <!-- Image media -->
          <template v-if="mediaKind(mediaSrc(media)) === 'image' && mediaSrc(media)">
            <Image :src="mediaSrc(media) || ''" alt="" class="h-full w-full object-cover" />
          </template>

          <!-- Video media -->
          <template v-else-if="mediaKind(primaryMediaValue(media)) === 'video'">
            <template v-if="activeVideo && activeVideo.item.id === media.id">
              <div class="h-full w-full bg-black">
                <VideoPlayer
                  :url="activeVideo.url"
                  :title="activeVideo.title"
                  subtitle-url=""
                  mode="inline"
                  @close="closeVideo"
                />
              </div>
            </template>
            <template v-else>
              <template v-if="posterUrl(media)">
                <Image :src="posterUrl(media) || ''" alt="" class="h-full w-full object-cover" />
              </template>
              <template v-else>
                <div class="h-full w-full bg-gray-200 dark:bg-gray-700" />
              </template>
              <button
                type="button"
                class="absolute inset-0 grid place-items-center"
                aria-label="Play video"
                @click="handleVideoClick(media, $event)"
              >
                <Icon name="mdi:play-circle-outline" class="h-12 w-12 text-white/90 drop-shadow" />
              </button>
              <span
                class="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white uppercase"
              >
                {{ mediaFormat(media) }}
              </span>
            </template>
          </template>

          <!-- Audio media -->
          <template v-else-if="mediaKind(primaryMediaValue(media)) === 'audio'">
            <template v-if="activeAudio && activeAudio.item.id === media.id">
              <div class="h-full w-full bg-black">
                <AudioPlayer
                  :url="activeAudio.url"
                  :title="activeAudio.title"
                  mode="inline"
                  @close="closeAudio"
                />
              </div>
            </template>
            <template v-else>
              <div
                class="flex h-full w-full items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700"
              >
                <Icon
                  name="mdi:music-note-outline"
                  class="h-10 w-10 text-gray-600 dark:text-gray-300"
                />
              </div>
              <button
                type="button"
                class="absolute inset-0 grid place-items-center"
                aria-label="Play audio"
                @click="handleAudioClick(media, $event)"
              >
                <Icon name="mdi:play-circle-outline" class="h-12 w-12 text-white/90 drop-shadow" />
              </button>
              <span
                class="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white uppercase"
              >
                {{ mediaFormat(media) }}
              </span>
            </template>
          </template>

          <!-- Other media types -->
          <template v-else>
            <span class="text-4xl font-medium text-gray-400 dark:text-gray-500">
              {{ getInitials(media.fileName) }}
            </span>
            <span
              v-if="mediaFormat(media)"
              class="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-white uppercase"
            >
              {{ mediaFormat(media) }}
            </span>
          </template>
        </div>
        <div class="p-4">
          <div class="flex items-start justify-between">
            <div class="min-w-0 flex-1">
              <h3 class="mb-1 text-sm font-medium text-gray-900 dark:text-gray-100">
                {{ media.fileName }}
              </h3>
              <p class="text-xs text-gray-500 dark:text-gray-400">
                {{ media.type }} • {{ mediaFormat(media) }}
              </p>
              <p v-if="media.duration" class="text-xs text-gray-500 dark:text-gray-400">
                Duration: {{ formatDuration(media.duration) }}
              </p>
            </div>
            <button
              type="button"
              class="ml-2 inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-gray-500 transition-all duration-200 hover:bg-red-50 hover:text-red-600 focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-red-900/20 dark:hover:text-red-400 dark:focus:ring-gray-500"
              aria-label="Delete media"
              @click="handleDeleteClick(media, $event)"
            >
              <TrashCanOutlineIcon class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Empty state -->
    <div v-else class="py-8 text-center">
      <Icon name="mdi:image-outline" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-gray-100">No related media</h3>
      <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
        Upload media files to associate them with this {{ entityType }}.
      </p>
    </div>

    <!-- Upload Modal -->
    <FileUploadModal
      v-if="showUploadModal"
      :title="`Upload Media for ${entityType}`"
      :accept="'video/*,audio/*,.vtt,.srt,image/*'"
      :max-files="10"
      :form-fields="mediaFormFields"
      :upload-handler="handleMediaUpload"
      @close="showUploadModal = false"
      @uploaded="handleMediaUploaded"
    />

    <!-- Delete Confirmation Modal -->
    <ConfirmModal
      v-if="showDeleteModal"
      :open="showDeleteModal"
      title="Delete Media"
      :message="`Are you sure you want to delete '${mediaToDelete?.fileName}'? This action cannot be undone.`"
      confirm-label="Delete"
      variant="danger"
      @confirm="confirmDelete"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, computed } from 'vue'
import { useMedia } from '@/composables/useMedia'
import { useToast } from '@/composables/useToast'
import { useResourceService } from '@/composables/useResourceService'
import FileUploadModal from '@/components/molecules/FileUploadModal.vue'
import Image from '@/components/molecules/Image.vue'
import VideoPlayer from '@/components/organisms/VideoPlayer.vue'
import AudioPlayer from '@/components/organisms/AudioPlayer.vue'
import ConfirmModal from '@/components/molecules/ConfirmModal.vue'
import TrashCanOutlineIcon from '~icons/mdi/trash-can-outline'
import Button from '@/components/atoms/Button.vue'

interface Props {
  entityType: string
  entityId: string
  relationshipType?: string
  showUploadButton?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  showUploadButton: true,
})

const { fetchRelatedMedia, uploadViaMediaResource } = useMedia()
const { push } = useToast()
const { remove } = useResourceService()

interface LocalMediaItem {
  id: string
  fileName: string
  type: string
  format?: string
  duration?: number
  [key: string]: unknown
}

const emit = defineEmits<{
  'media-click': [mediaId: string, media: LocalMediaItem]
}>()

const relatedMedia = ref<LocalMediaItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
const showUploadModal = ref(false)

// Video player state
const activeVideo = ref<{
  item: LocalMediaItem
  url: string
  title: string
  posterUrl?: string
} | null>(null)

// Audio player state
const activeAudio = ref<{
  item: LocalMediaItem
  url: string
  title: string
  posterUrl?: string
} | null>(null)

// Delete modal state
const showDeleteModal = ref(false)
const mediaToDelete = ref<LocalMediaItem | null>(null)
const deleting = ref(false)

// Media form fields for upload modal
const mediaFormFields = computed(() => {
  const baseFields = [
    {
      key: 'type',
      label: 'Type',
      type: 'select' as const,
      value: 'original',
      options: ['original', 'dubbed', 'trailer', 'voice_over', 'subtitle', 'poster', 'thumbnail'],
    },
    {
      key: 'language',
      label: 'Language',
      type: 'select' as const,
      value: 'en',
      options: ['en', 'es', 'fr', 'de', 'ja', 'ko', 'zh', 'hi'],
    },
    {
      key: 'description',
      label: 'Description',
      type: 'textarea' as const,
      placeholder: 'Enter description',
      value: '',
    },
    {
      key: 'format',
      label: 'Format',
      type: 'select' as const,
      value: 'mp4',
      options: [
        'mp4',
        'mov',
        'mkv',
        'avi',
        'webm',
        'm3u8',
        'mp3',
        'wav',
        'aac',
        'flac',
        'srt',
        'vtt',
        'ass',
        'ssa',
        'jpg',
        'png',
        'webp',
      ],
    },
    {
      key: 'tags',
      label: 'Tags',
      type: 'tags' as const,
      value: [],
    },
  ]

  // Add relationships field as tags
  const relationshipsField = {
    key: 'relationships',
    label: 'Relationships',
    type: 'tags' as const,
    value: [`${props.entityType}:${props.entityId}:belongs_to`].map((rel) => {
      // Extract relationship type from full string (entityType:entityId:relationshipType)
      const parts = rel.split(':')
      return parts.length === 3 ? parts[2] : rel
    }),
    placeholder: 'Add relationship types (e.g., belongs_to, created_by)',
  }

  return [...baseFields, relationshipsField]
})

async function loadRelatedMedia() {
  if (!props.entityId) return

  loading.value = true
  error.value = null

  try {
    const media = await fetchRelatedMedia(props.entityType, props.entityId, props.relationshipType)
    relatedMedia.value = media as unknown as LocalMediaItem[]
  } catch (err: unknown) {
    error.value = (err as Error)?.message || 'Failed to load related media'
  } finally {
    loading.value = false
  }
}

function handleMediaUploaded(data: { count: number }) {
  showUploadModal.value = false
  push({
    id: `${Date.now()}-media-upload-success`,
    type: 'success',
    title: 'Media uploaded successfully',
    body: `${data.count} file(s) uploaded and linked to this ${props.entityType}`,
    position: 'tr',
    timeout: 4000,
  })
  // Reload related media
  loadRelatedMedia()
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = Math.floor(seconds % 60)

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`
}

// Media helper functions (from GalleryTemplate)
type MediaKind = 'image' | 'video' | 'audio' | 'other'
const imageExts = new Set(['png', 'jpg', 'jpeg', 'webp', 'gif'])
const videoExts = new Set(['mp4', 'avi', 'mov', 'mkv', 'webm', 'm3u8'])
const audioExts = new Set(['mp3', 'wav', 'aac', 'flac'])

const getFileExtension = (url: string | undefined): string => {
  if (!url) return ''
  const u = url.split('?')[0]
  const last = u.split('.').pop() || ''
  return last.toLowerCase()
}

const mediaFormat = (item: LocalMediaItem): string => {
  const fmt = String(item?.format || '').toLowerCase()
  if (fmt) return fmt.toUpperCase()
  const url = String(
    (item as Record<string, unknown>)?.fileUrl || (item as Record<string, unknown>)?.url || '',
  )
  const ext = getFileExtension(url)
  return ext ? ext.toUpperCase() : ''
}

const mediaKind = (value: string | null | undefined): MediaKind => {
  const raw = (value ?? '').trim()
  if (!raw) return 'other'
  const lower = raw.toLowerCase()
  // Handle MIME-like content type strings
  if (lower.startsWith('image/')) return 'image'
  if (lower.startsWith('video/')) return 'video'
  if (lower.startsWith('audio/')) return 'audio'

  // Handle explicit format or URLs by extension
  const ext = getFileExtension(lower)
  if (imageExts.has(ext)) return 'image'
  if (videoExts.has(ext)) return 'video'
  if (audioExts.has(ext)) return 'audio'
  return 'other'
}

const primaryMediaValue = (item: LocalMediaItem): string | null => {
  const ct = String((item as Record<string, unknown>)?.contentType || '')
  if (ct) return ct
  const fmt = String(item?.format || '')
  if (fmt) return fmt
  const url = String(
    (item as Record<string, unknown>)?.fileUrl || (item as Record<string, unknown>)?.url || '',
  )
  return url || null
}

const mediaSrc = (item: LocalMediaItem): string | null => {
  const thumb = String((item as Record<string, unknown>)?.thumbnailUrl || '')
  if (thumb) return thumb
  const file = String((item as Record<string, unknown>)?.fileUrl || '')
  if (file && mediaKind(file) === 'image') return file
  return null
}

const posterUrl = (item: LocalMediaItem): string | null => {
  const thumb = String((item as Record<string, unknown>)?.thumbnailUrl || '')
  if (thumb) return thumb
  return null
}

const getInitials = (name: unknown) =>
  !name
    ? '?'
    : String(name)
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

// Video player handlers
const handleVideoClick = (item: LocalMediaItem, event: Event) => {
  event.stopPropagation()
  const videoUrl = String(
    (item as Record<string, unknown>)?.fileUrl || (item as Record<string, unknown>)?.url || '',
  )
  const title = String(item?.fileName || 'Video')
  const poster = posterUrl(item)

  if (videoUrl) {
    activeVideo.value = {
      item,
      url: videoUrl,
      title,
      posterUrl: poster || undefined,
    }
  }
}

const closeVideo = () => {
  activeVideo.value = null
}

// Audio player handlers
const handleAudioClick = (item: LocalMediaItem, event: Event) => {
  event.stopPropagation()
  const audioUrl = String(
    (item as Record<string, unknown>)?.fileUrl || (item as Record<string, unknown>)?.url || '',
  )
  const title = String(item?.fileName || 'Audio')
  const poster = posterUrl(item)

  if (audioUrl) {
    activeAudio.value = {
      item,
      url: audioUrl,
      title,
      posterUrl: poster || undefined,
    }
  }
}

const closeAudio = () => {
  activeAudio.value = null
}

// Media item click handler
const handleMediaClick = (media: LocalMediaItem) => {
  // Bubble up the click so parent views can decide navigation (e.g., open editor)
  emit('media-click', String(media.id), media)
}

// Media upload handler
async function handleMediaUpload(files: File[], formData: Record<string, string | string[]>) {
  // Extract relationships from form data and format them
  const relationshipTypes = Array.isArray(formData.relationships)
    ? (formData.relationships as string[])
    : []

  // Format relationship types into full relationship strings
  const relationships = relationshipTypes.map(
    (relType) => `${props.entityType}:${props.entityId}:${relType}`,
  )

  for (const file of files) {
    try {
      await uploadViaMediaResource(file, {
        type: String(formData.type || 'original'),
        format: String(formData.format || 'mp4'),
        language: String(formData.language || 'en'),
        description: formData.description ? String(formData.description) : undefined,
        tags: Array.isArray(formData.tags) ? (formData.tags as string[]) : [],
        relationships: relationships,
        metadata: {
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
        },
      })
    } catch (error) {
      console.error('Upload failed:', error)
      push({
        id: `${Date.now()}-upload-error`,
        type: 'error',
        title: 'Upload failed',
        body: (error as Error)?.message || 'Failed to upload file',
        position: 'tr',
        timeout: 6000,
      })
      throw error
    }
  }
}

// Delete handlers
const handleDeleteClick = (media: LocalMediaItem, event: Event) => {
  event.stopPropagation()
  mediaToDelete.value = media
  showDeleteModal.value = true
}

const confirmDelete = async () => {
  if (!mediaToDelete.value) return

  deleting.value = true
  try {
    // Delete the media file - backend automatically handles media-relationships cleanup
    await remove('media', mediaToDelete.value.id)

    push({
      id: `${Date.now()}-media-delete-success`,
      type: 'success',
      title: 'Media deleted successfully',
      body: `"${mediaToDelete.value.fileName}" has been deleted`,
      position: 'tr',
      timeout: 4000,
    })

    // Refresh the media list
    await loadRelatedMedia()
  } catch (error) {
    push({
      id: `${Date.now()}-media-delete-error`,
      type: 'error',
      title: 'Failed to delete media',
      body: (error as Error)?.message || 'Unable to delete media file',
      position: 'tr',
      timeout: 6000,
    })
  } finally {
    deleting.value = false
    showDeleteModal.value = false
    mediaToDelete.value = null
  }
}

onMounted(() => {
  loadRelatedMedia()
})

watch([() => props.entityType, () => props.entityId, () => props.relationshipType], () => {
  loadRelatedMedia()
})
</script>
