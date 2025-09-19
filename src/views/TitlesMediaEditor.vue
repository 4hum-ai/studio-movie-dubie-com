<template>
  <div class="min-h-screen space-y-4 p-4">
    <AppBar :show-back="true" @back="goBack">
      <template #title>
        <div class="flex items-center gap-2">
          <span>{{ titleText }}</span>
        </div>
      </template>
      <template #actions>
        <div class="flex items-center gap-2">
          <Button size="sm" variant="secondary" @click="refresh">Refresh</Button>
          <Button size="sm" variant="primary" :disabled="!hasUnsaved" @click="updateManifest">
            Update Manifest
          </Button>
        </div>
      </template>
    </AppBar>
    <div class="h-16" />

    <div class="grid grid-cols-12 gap-4">
      <!-- Tracks panel -->
      <div class="col-span-12 space-y-4 md:col-span-3">
        <Card>
          <div class="border-b border-gray-200 p-3 dark:border-gray-700">
            <h3 class="text-sm font-semibold">Tracks</h3>
          </div>
          <div class="space-y-4 p-3">
            <div>
              <h4 class="text-xs font-semibold text-gray-500 uppercase">Video</h4>
              <ul class="mt-2 space-y-1">
                <li v-for="v in manifest.video" :key="v.id">
                  <button class="text-sm hover:underline" @click="selectVideo(v.id)">
                    {{ v.label }}
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-xs font-semibold text-gray-500 uppercase">Audio</h4>
              <ul class="mt-2 space-y-1">
                <li
                  v-for="a in manifest.audio"
                  :key="a.id"
                  class="flex items-center justify-between"
                >
                  <button class="text-sm hover:underline" @click="selectAudio(a.id)">
                    {{ a.label }}
                  </button>
                  <div class="flex items-center gap-2">
                    <Button size="xs" variant="ghost" @click="createDubbingFrom(a.id)"
                      >Dubbing</Button
                    >
                  </div>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-xs font-semibold text-gray-500 uppercase">Captions</h4>
              <ul class="mt-2 space-y-1">
                <li
                  v-for="c in manifest.captions"
                  :key="c.id"
                  class="flex items-center justify-between"
                >
                  <button class="text-sm hover:underline" @click="selectCaption(c.id)">
                    {{ c.label }}
                  </button>
                  <div class="flex items-center gap-2">
                    <Button size="xs" variant="ghost" @click="translateCaptionFrom(c.id)"
                      >Translate</Button
                    >
                    <Button size="xs" variant="ghost" @click="editCaption(c.id)">Edit</Button>
                  </div>
                </li>
              </ul>
            </div>
            <div class="flex items-center gap-2">
              <Button size="sm" variant="secondary" @click="uploadTrack">Upload Track</Button>
              <Button size="sm" variant="secondary" v-if="isMp4" @click="transcodeToHls"
                >Transcode to HLS</Button
              >
            </div>
          </div>
        </Card>
      </div>

      <!-- Preview player -->
      <div class="col-span-12 space-y-4 md:col-span-6">
        <Card>
          <div class="border-b border-gray-200 p-3 dark:border-gray-700">
            <h3 class="text-sm font-semibold">Preview</h3>
          </div>
          <div class="p-3">
            <VideoPlayer :url="playerSrc" mode="inline" />
          </div>
        </Card>
      </div>

      <!-- Context panel -->
      <div class="col-span-12 space-y-4 md:col-span-3">
        <Card>
          <div class="border-b border-gray-200 p-3 dark:border-gray-700">
            <h3 class="text-sm font-semibold">Actions</h3>
          </div>
          <div class="space-y-2 p-3">
            <Button size="sm" variant="primary" @click="createDubbing">Create Dubbing</Button>
            <Button size="sm" variant="primary" @click="createTranslatedCaption()"
              >Create Translated Caption</Button
            >
          </div>
        </Card>

        <Card>
          <div class="border-b border-gray-200 p-3 dark:border-gray-700">
            <h3 class="text-sm font-semibold">Jobs</h3>
          </div>
          <div class="p-3 text-sm text-gray-500">
            <p v-if="jobs.length === 0">No jobs yet.</p>
            <ul v-else class="space-y-2">
              <li v-for="j in jobs" :key="j.id" class="flex items-center justify-between">
                <span>{{ j.label }}</span>
                <span>{{ j.progress }}%</span>
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'TitlesMediaEditor' })
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppBar from '@/components/molecules/AppBar.vue'
import Card from '@/components/atoms/Card.vue'
import Button from '@/components/atoms/Button.vue'
import VideoPlayer from '@/components/organisms/VideoPlayer.vue'

const route = useRoute()
const router = useRouter()

const titleId = computed(() => String(route.params.id || ''))
const mediaId = computed(() => String(route.params.mediaId || ''))

const isMp4 = ref(false)
const hasUnsaved = ref(false)
const selectedAudioId = ref<string | null>(null)
const selectedCaptionId = ref<string | null>(null)
const selectedVideoId = ref<string | null>(null)

type Track = { id: string; label: string; lang?: string; url?: string; kind?: string }
const manifest = ref<{ video: Track[]; audio: Track[]; captions: Track[] }>({
  video: [],
  audio: [],
  captions: [],
})

const titleText = computed(() => `Title ${titleId.value} / Media ${mediaId.value}`)
const playerSrc = computed(() => {
  const byId = manifest.value.video.find((v) => v.id === selectedVideoId.value)?.url
  return byId || manifest.value.video[0]?.url || ''
})

function goBack() {
  router.back()
}

function refresh() {
  // mock reload
}

async function updateManifest() {
  // mock persist
  hasUnsaved.value = false
}

function selectVideo(id: string) {
  selectedVideoId.value = id
}
function selectAudio(id: string) {
  selectedAudioId.value = id
}
function selectCaption(id: string) {
  selectedCaptionId.value = id
}

function createDubbing() {
  // mock job
  jobs.value.push({ id: String(Date.now()), label: 'Dubbing', progress: 0 })
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createDubbingFrom(_audioId: string) {
  createDubbing()
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function translateCaptionFrom(_captionId: string) {
  // mock translate
}
function createTranslatedCaption() {
  // mock translate from currently selected caption
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function editCaption(_captionId: string) {
  // open editor panel later
}
function uploadTrack() {
  // mock upload
}
function transcodeToHls() {
  // mock transcode
}

const jobs = ref<{ id: string; label: string; progress: number }[]>([])

onMounted(() => {
  // mock manifest
  manifest.value = {
    video: [
      { id: 'v-1080p', label: '1080p', url: 'https://cdn.test/video/1080.m3u8' },
      { id: 'v-720p', label: '720p', url: 'https://cdn.test/video/720.m3u8' },
    ],
    audio: [
      { id: 'a-orig-en', label: 'Original EN', lang: 'en' },
      { id: 'a-dub-es', label: 'Dubbed ES', lang: 'es' },
    ],
    captions: [
      { id: 'c-orig-en', label: 'Captions EN', lang: 'en' },
      { id: 'c-trans-es', label: 'Captions ES (translated)', lang: 'es' },
    ],
  }
})
</script>
