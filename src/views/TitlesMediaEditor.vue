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
            <div class="pt-2">
              <Button size="sm" variant="secondary" @click="uploadTrack">Upload Track</Button>
              <Button
                size="sm"
                variant="primary"
                class="ml-2"
                :disabled="!editor.hasUnsaved"
                @click="updateManifest"
              >
                Update Manifest
              </Button>
            </div>
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
    <VoicePickerModal
      :open="showVoicePicker"
      :voices="mockVoices"
      @close="showVoicePicker = false"
      @select="
        () => {
          showVoicePicker = false
          createDubbing()
        }
      "
    />
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
// import CaptionEditor from '@/components/molecules/CaptionEditor.vue'
import { useEditorStore } from '@/stores/editor'
import { useHlsManifest } from '@/composables/useHlsManifest'
import VoicePickerModal from '@/components/molecules/VoicePickerModal.vue'

const route = useRoute()
const router = useRouter()

const titleId = computed(() => String(route.params.id || ''))
const mediaId = computed(() => String(route.params.mediaId || ''))

const editor = useEditorStore()
editor.initialize({ titleId: titleId.value, mediaId: mediaId.value })
const isMp4 = editor.isMp4
const hasUnsaved = editor.hasUnsaved
const selectedAudioId = ref<string | null>(null)
const selectedCaptionId = ref<string | null>(null)
const selectedVideoId = ref<string | null>(null)

type Track = { id: string; label: string; lang?: string; url?: string; kind?: string }
const manifest = ref<{ video: Track[]; audio: Track[]; captions: Track[] }>({
  video: [],
  audio: [],
  captions: [],
})
const { loadFromMock } = useHlsManifest()

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
  editor.commitWorkingCopy()
}

function selectVideo(id: string) {
  selectedVideoId.value = id
  editor.selectVideo(id)
}
function selectAudio(id: string) {
  selectedAudioId.value = id
  editor.selectAudio(id)
}
function selectCaption(id: string) {
  selectedCaptionId.value = id
  editor.selectCaption(id)
}

function createDubbing() {
  // mock job
  jobs.value.push({ id: String(Date.now()), label: 'Dubbing', progress: 0 })
  const id = jobs.value[jobs.value.length - 1].id
  const timer = setInterval(() => {
    const j = jobs.value.find((x) => x.id === id)
    if (!j) return clearInterval(timer)
    j.progress = Math.min(100, j.progress + 10)
    if (j.progress >= 100) clearInterval(timer)
  }, 800)
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createDubbingFrom(_audioId: string) {
  showVoicePicker.value = true
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
  // mock upload: add a new audio track
  const newId = `a-new-${Date.now()}`
  editor.addTrack({ id: newId, label: 'New Dub (mock)', lang: 'es', kind: 'audio' })
}
function transcodeToHls() {
  // mock transcode
}

const jobs = ref<{ id: string; label: string; progress: number }[]>([])
const showVoicePicker = ref(false)
const mockVoices = ref([
  { id: '11labs-jane', name: 'Jane', provider: 'ElevenLabs' },
  { id: '11labs-roberto', name: 'Roberto', provider: 'ElevenLabs' },
  { id: 'azure-aria', name: 'Aria', provider: 'Azure' },
  { id: 'gcp-en-us-wavenet-d', name: 'Wavenet D', provider: 'GCP' },
])

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
  loadFromMock({
    video: manifest.value.video.map((v) => ({ ...v, kind: 'video' })),
    audio: manifest.value.audio.map((a) => ({ ...a, kind: 'audio' })),
    captions: manifest.value.captions.map((c) => ({ ...c, kind: 'captions' })),
  })
  editor.setManifest({
    video: manifest.value.video.map((v) => ({ ...v, kind: 'video' })),
    audio: manifest.value.audio.map((a) => ({ ...a, kind: 'audio' })),
    captions: manifest.value.captions.map((c) => ({ ...c, kind: 'captions' })),
  })
})
</script>
