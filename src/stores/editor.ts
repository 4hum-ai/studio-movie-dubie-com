import { defineStore } from 'pinia'
import { ref } from 'vue'

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

  const workingCopy = ref<HlsManifest>({ video: [], audio: [], captions: [] })

  const hasUnsaved = ref<boolean>(false)
  const jobs = ref<{ id: string; label: string; progress: number }[]>([])

  // Selections are now owned by useMediaEditor composable

  function initialize(ids: { titleId: string; mediaId: string }) {
    titleId.value = ids.titleId
    mediaId.value = ids.mediaId
  }

  function setManifest(next: HlsManifest) {
    workingCopy.value = JSON.parse(JSON.stringify(next))
    hasUnsaved.value = false
  }

  function markUnsaved() {
    hasUnsaved.value = true
  }

  // Selection setters removed; use useMediaEditor instead

  function addTrack(track: MediaTrack) {
    if (track.kind === 'video') workingCopy.value.video.push(track)
    else if (track.kind === 'audio') workingCopy.value.audio.push(track)
    else if (track.kind === 'captions') workingCopy.value.captions.push(track)
    hasUnsaved.value = true
  }

  function commitWorkingCopy() {
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
    workingCopy,
    hasUnsaved,
    jobs,
    initialize,
    setManifest,
    markUnsaved,
    addTrack,
    removeTrack,
    enqueueJob,
    commitWorkingCopy,
    setWorkingCopy,
    persistToLocal,
    loadFromLocal,
  }
})
