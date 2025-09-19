import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export type MediaTrack = {
  id: string
  label: string
  lang?: string
  url?: string
  kind?: 'video' | 'audio' | 'captions'
}

export type HlsManifest = {
  video: MediaTrack[]
  audio: MediaTrack[]
  captions: MediaTrack[]
}

export const useEditorStore = defineStore('editor', () => {
  const titleId = ref<string>('')
  const mediaId = ref<string>('')

  const manifest = ref<HlsManifest>({ video: [], audio: [], captions: [] })
  const workingCopy = ref<HlsManifest>({ video: [], audio: [], captions: [] })

  const selectedVideoId = ref<string>('')
  const selectedAudioId = ref<string>('')
  const selectedCaptionId = ref<string>('')

  const hasUnsaved = ref<boolean>(false)
  const isMp4 = ref<boolean>(false)

  const jobs = ref<{ id: string; label: string; progress: number }[]>([])

  const selectedVideo = computed(
    () => workingCopy.value.video.find((t) => t.id === selectedVideoId.value) || null,
  )
  const selectedAudio = computed(
    () => workingCopy.value.audio.find((t) => t.id === selectedAudioId.value) || null,
  )
  const selectedCaption = computed(
    () => workingCopy.value.captions.find((t) => t.id === selectedCaptionId.value) || null,
  )

  function initialize(ids: { titleId: string; mediaId: string }) {
    titleId.value = ids.titleId
    mediaId.value = ids.mediaId
  }

  function setManifest(next: HlsManifest) {
    manifest.value = JSON.parse(JSON.stringify(next))
    workingCopy.value = JSON.parse(JSON.stringify(next))
    if (!selectedVideoId.value && workingCopy.value.video[0]) {
      selectedVideoId.value = workingCopy.value.video[0].id
    }
    if (!selectedAudioId.value && workingCopy.value.audio[0]) {
      selectedAudioId.value = workingCopy.value.audio[0].id
    }
    if (!selectedCaptionId.value && workingCopy.value.captions[0]) {
      selectedCaptionId.value = workingCopy.value.captions[0].id
    }
    hasUnsaved.value = false
  }

  function markUnsaved() {
    hasUnsaved.value = true
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

  function addTrack(track: MediaTrack) {
    if (track.kind === 'video') workingCopy.value.video.push(track)
    else if (track.kind === 'audio') workingCopy.value.audio.push(track)
    else if (track.kind === 'captions') workingCopy.value.captions.push(track)
    hasUnsaved.value = true
  }

  function commitWorkingCopy() {
    manifest.value = JSON.parse(JSON.stringify(workingCopy.value))
    hasUnsaved.value = false
  }

  function setWorkingCopy(next: HlsManifest) {
    workingCopy.value = JSON.parse(JSON.stringify(next))
    hasUnsaved.value = true
  }

  function localKey(): string {
    return `admin-ui:editor:manifest:${titleId.value}:${mediaId.value}`
  }

  function persistToLocal() {
    try {
      const key = localKey()
      localStorage.setItem(key, JSON.stringify(workingCopy.value))
    } catch {
      /* ignore */
    }
  }

  function loadFromLocal(): boolean {
    try {
      const key = localKey()
      const raw = localStorage.getItem(key)
      if (!raw) return false
      const parsed = JSON.parse(raw) as HlsManifest
      setManifest(parsed)
      return true
    } catch {
      return false
    }
  }

  function removeTrack(kind: 'video' | 'audio' | 'captions', id: string) {
    const list = workingCopy.value[kind]
    const idx = list.findIndex((t) => t.id === id)
    if (idx !== -1) {
      list.splice(idx, 1)
      hasUnsaved.value = true
    }
  }

  function enqueueJob(label: string) {
    jobs.value.push({ id: String(Date.now()), label, progress: 0 })
  }

  return {
    titleId,
    mediaId,
    manifest,
    workingCopy,
    selectedVideoId,
    selectedAudioId,
    selectedCaptionId,
    selectedVideo,
    selectedAudio,
    selectedCaption,
    hasUnsaved,
    isMp4,
    jobs,
    initialize,
    setManifest,
    markUnsaved,
    selectVideo,
    selectAudio,
    selectCaption,
    addTrack,
    removeTrack,
    enqueueJob,
    commitWorkingCopy,
    setWorkingCopy,
    persistToLocal,
    loadFromLocal,
  }
})
