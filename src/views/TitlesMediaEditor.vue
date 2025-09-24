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
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Tracks</h3>
          </div>
          <div class="space-y-4 p-3">
            <div>
              <h4 class="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                Video
              </h4>
              <ul class="mt-2 space-y-1">
                <li v-for="v in manifest.video" :key="v.id">
                  <button
                    class="text-sm text-gray-700 hover:text-gray-900 hover:underline dark:text-gray-300 dark:hover:text-gray-100"
                    @click="selectVideo(v.id)"
                  >
                    {{ v.label }}
                  </button>
                </li>
              </ul>
            </div>
            <div>
              <h4 class="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                Audio
              </h4>
              <ul class="mt-2 space-y-1">
                <li
                  v-for="a in manifest.audio"
                  :key="a.id"
                  class="flex items-center justify-between"
                >
                  <button
                    class="text-sm text-gray-700 hover:text-gray-900 hover:underline dark:text-gray-300 dark:hover:text-gray-100"
                    @click="selectAudio(a.id)"
                  >
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
              <h4 class="text-xs font-semibold text-gray-500 uppercase dark:text-gray-400">
                Captions
              </h4>
              <ul class="mt-2 space-y-1">
                <li
                  v-for="c in manifest.captions"
                  :key="c.id"
                  class="flex items-center justify-between"
                >
                  <button
                    class="text-sm text-gray-700 hover:text-gray-900 hover:underline dark:text-gray-300 dark:hover:text-gray-100"
                    @click="selectCaption(c.id)"
                  >
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
              <Button
                size="sm"
                variant="secondary"
                v-if="isMp4"
                :disabled="isTranscoding"
                @click="transcodeToHls"
              >
                {{ isTranscoding ? 'Transcoding...' : 'Transcode to HLS' }}
              </Button>
            </div>
          </div>
        </Card>
      </div>

      <!-- Preview player -->
      <div class="col-span-12 space-y-4 md:col-span-6">
        <Card>
          <div class="border-b border-gray-200 p-3 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Preview</h3>
          </div>
          <div class="p-3">
            <VideoPlayer
              :url="playerSrc"
              :audio-tracks="manifest.audio"
              :selected-audio-id="selectedAudioId || undefined"
              mode="inline"
              @audio-track-change="onAudioTrackChange"
            />
          </div>
        </Card>
        <Card>
          <div class="border-b border-gray-200 p-3 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Caption Editor</h3>
          </div>
          <div class="p-3">
            <div
              v-if="captionSegments.length === 0"
              class="text-sm text-gray-500 dark:text-gray-400"
            >
              Select a caption track and click Translate to load segments.
            </div>
            <CaptionEditor v-else :segments="captionSegments" @update="onSegmentUpdate" />
          </div>
        </Card>
      </div>

      <!-- Context panel -->
      <div class="col-span-12 space-y-4 md:col-span-3">
        <Card>
          <div class="border-b border-gray-200 p-3 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Actions</h3>
          </div>
          <div class="space-y-2 p-3">
            <Button size="sm" variant="primary" @click="createDubbing">Create Dubbing</Button>
            <Button size="sm" variant="primary" @click="createTranslatedCaption()"
              >Create Translated Caption</Button
            >
            <div class="pt-2">
              <Button
                v-if="isMp4"
                size="sm"
                variant="secondary"
                :disabled="isTranscoding"
                @click="transcodeToHls"
              >
                {{ isTranscoding ? 'Transcoding...' : 'Transcode to HLS' }}
              </Button>
            </div>
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
              <Button size="sm" variant="outline" class="ml-2" @click="saveLocal">
                Save (Local)
              </Button>
            </div>
          </div>
        </Card>

        <Card>
          <div class="border-b border-gray-200 p-3 dark:border-gray-700">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Jobs</h3>
          </div>
          <div class="p-3 text-sm text-gray-500 dark:text-gray-400">
            <p v-if="transcodingJobs.length === 0">No jobs yet.</p>
            <ul v-else class="space-y-2">
              <li
                v-for="j in transcodingJobs"
                :key="j.id"
                class="flex items-center justify-between"
              >
                <div class="flex flex-col">
                  <span>{{ j.label }}</span>
                  <span class="text-xs text-gray-400 capitalize dark:text-gray-500">{{
                    j.status
                  }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span>{{ j.progress }}%</span>
                  <div class="h-2 w-8 overflow-hidden rounded-full bg-gray-200">
                    <div
                      class="h-full bg-blue-500 transition-all duration-300"
                      :class="{
                        'bg-green-500': j.status === 'completed',
                        'bg-red-500': j.status === 'failed',
                      }"
                      :style="{ width: `${j.progress}%` }"
                    ></div>
                  </div>
                </div>
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
import CaptionEditor from '@/components/molecules/CaptionEditor.vue'
import { useEditorStore } from '@/stores/editor'
import { useMediaEditor } from '@/composables/useMediaEditor'
import VoicePickerModal from '@/components/molecules/VoicePickerModal.vue'

const route = useRoute()
const router = useRouter()

const titleId = computed(() => String(route.params.id || ''))
const mediaId = computed(() => String(route.params.mediaId || ''))

const editor = useEditorStore()
editor.initialize({ titleId: titleId.value, mediaId: mediaId.value })
const mediaEditor = useMediaEditor(mediaId.value)
const isMp4 = mediaEditor.isMp4
const hasUnsaved = editor.hasUnsaved
const selectedAudioId = mediaEditor.selectedAudioId
const selectedCaptionId = mediaEditor.selectedCaptionId
const selectedVideoId = mediaEditor.selectedVideoId
const manifest = mediaEditor.manifest
const captionSegments = mediaEditor.currentCaptionSegments
const transcodingJobs = mediaEditor.transcodingJobs
const isTranscoding = mediaEditor.isTranscoding

const titleText = computed(() => `Title ${titleId.value} / Media ${mediaId.value}`)
const playerSrc = mediaEditor.sourceUrl

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

function saveLocal() {
  mediaEditor.saveLocal()
}

function selectVideo(id: string) {
  selectedVideoId.value = id
  mediaEditor.selectVideo(id)
}
function selectAudio(id: string) {
  selectedAudioId.value = id
  mediaEditor.selectAudio(id)
}
function selectCaption(id: string) {
  selectedCaptionId.value = id
  mediaEditor.selectCaption(id)
}

function createDubbing() {
  // TODO: Implement real dubbing workflow
  console.log('Create dubbing functionality not yet implemented')
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function createDubbingFrom(_audioId: string) {
  showVoicePicker.value = true
}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function translateCaptionFrom(_captionId: string) {
  // mock translate
  const t = manifest.value.captions.find((c) => c.id === selectedCaptionId.value)
  if (t) void mediaEditor.loadCaptionSegments(t)
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
async function transcodeToHls() {
  try {
    await mediaEditor.transcodeToHls()
  } catch (error) {
    console.error('Failed to start transcoding:', error)
  }
}

const showVoicePicker = ref(false)
const mockVoices = ref([
  { id: '11labs-jane', name: 'Jane', provider: 'ElevenLabs' },
  { id: '11labs-roberto', name: 'Roberto', provider: 'ElevenLabs' },
  { id: 'azure-aria', name: 'Aria', provider: 'Azure' },
  { id: 'gcp-en-us-wavenet-d', name: 'Wavenet D', provider: 'GCP' },
])

onMounted(() => {
  /* useMediaEditor autoloads via mediaId */
})

function onSegmentUpdate(id: string, text: string) {
  mediaEditor.updateCaptionSegment(id, { text })
}

function onAudioTrackChange(trackId: string) {
  selectedAudioId.value = trackId
  mediaEditor.selectAudio(trackId)
}
</script>
