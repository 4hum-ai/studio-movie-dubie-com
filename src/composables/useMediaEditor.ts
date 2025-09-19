import { ref, computed } from 'vue'
import { useResourceService } from '@/composables/useResourceService'
import { useHlsManifest } from '@/composables/useHlsManifest'

export type Track = {
  id: string
  label: string
  kind: 'video' | 'audio' | 'captions'
  url?: string
  lang?: string
}

export type Manifest = { video: Track[]; audio: Track[]; captions: Track[] }

export type CaptionSegment = { id: string; start: number; end: number; text: string }

export function useMediaEditor(mediaId: string, options: { autoLoad?: boolean } = {}) {
  const { autoLoad = true } = options

  const api = useResourceService()
  const { data: hlsData, loadFromUrl } = useHlsManifest()

  // Core state
  const media = ref<Record<string, unknown> | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const manifest = ref<Manifest>({ video: [], audio: [], captions: [] })

  // Selections (two-way friendly)
  const selectedVideoId = ref<string | null>(null)
  const selectedAudioId = ref<string | null>(null)
  const selectedCaptionId = ref<string | null>(null)
  const selectedCaptionLang = ref<string | null>(null)

  // Captions model by language
  const captionSegmentsByLang = ref<Record<string, CaptionSegment[]>>({})

  // Derived
  const sourceUrl = computed(() => manifest.value.video[0]?.url || '')
  const isHls = computed(() => /\.m3u8(\?|$)/i.test(sourceUrl.value))
  const isMp4 = computed(() => /\.mp4(\?|$)/i.test(sourceUrl.value))

  const tracksVideo = computed(() => manifest.value.video)
  const tracksAudio = computed(() => manifest.value.audio)
  const tracksCaptions = computed(() => manifest.value.captions)

  const captionsByLang = computed(() => {
    const map: Record<string, Track[]> = {}
    for (const t of manifest.value.captions) {
      const lang = t.lang || 'und'
      if (!map[lang]) map[lang] = []
      map[lang].push(t)
    }
    return map
  })
  const captionLangs = computed(() => Object.keys(captionsByLang.value))

  const currentCaptionSegments = computed<CaptionSegment[]>(() => {
    const lang = selectedCaptionLang.value || captionLangs.value[0]
    if (!lang) return []
    return captionSegmentsByLang.value[lang] || []
  })

  // Helpers
  const getExt = (u: string): string => {
    if (!u) return ''
    const clean = u.split('?')[0]
    return (clean.split('.').pop() || '').toLowerCase()
  }

  async function load() {
    if (!mediaId) return
    loading.value = true
    error.value = null
    try {
      const m = (await api.getById('media', mediaId)) as Record<string, unknown>
      media.value = m
      const url = String(m?.fileUrl || m?.url || '')
      const fmt = String(m?.format || '')
      const ctype = String(m?.contentType || '')
      const ext = getExt(url)

      const finalIsHls =
        ext === 'm3u8' ||
        (!ext && (/m3u8/i.test(url) || /mpegurl/i.test(ctype) || /m3u8/i.test(fmt)))
      const finalIsMp4 =
        ext === 'mp4' ||
        (!finalIsHls && (/mp4/i.test(url) || /mp4/i.test(ctype) || /mp4/i.test(fmt)))

      if (finalIsHls && url) {
        await loadFromUrl(url)
        const parsed = hlsData.value
        manifest.value = {
          video: parsed.video.map((t, i) => ({
            id: t.id || `v-${i}`,
            label: t.label,
            url: t.url,
            kind: 'video',
          })),
          audio: parsed.audio.map((t, i) => ({
            id: t.id || `a-${i}`,
            label: t.label,
            lang: t.lang,
            kind: 'audio',
          })),
          captions: parsed.captions.map((t, i) => ({
            id: t.id || `c-${i}`,
            label: t.label,
            lang: t.lang,
            kind: 'captions',
          })),
        }
      } else if (finalIsMp4 && url) {
        manifest.value = {
          video: [{ id: 'v-src', label: 'Source', url, kind: 'video' }],
          audio: [],
          captions: [],
        }
      } else {
        manifest.value = { video: [], audio: [], captions: [] }
      }

      // Initialize selections
      if (!selectedVideoId.value && manifest.value.video[0])
        selectedVideoId.value = manifest.value.video[0].id
      if (!selectedAudioId.value && manifest.value.audio[0])
        selectedAudioId.value = manifest.value.audio[0].id
      if (!selectedCaptionId.value && manifest.value.captions[0])
        selectedCaptionId.value = manifest.value.captions[0].id
      if (!selectedCaptionLang.value && captionLangs.value[0])
        selectedCaptionLang.value = captionLangs.value[0]
    } catch (e) {
      error.value = (e as Error)?.message || 'Failed to load media'
    } finally {
      loading.value = false
    }
  }

  // Mutations / Actions
  function selectVideo(id: string) {
    selectedVideoId.value = id
  }
  function selectAudio(id: string) {
    selectedAudioId.value = id
  }
  function selectCaption(id: string) {
    selectedCaptionId.value = id
  }
  function setCaptionLang(lang: string) {
    selectedCaptionLang.value = lang
  }

  function addTrack(track: Track) {
    manifest.value[track.kind].push(track)
  }
  function removeTrack(kind: Track['kind'], id: string) {
    const list = manifest.value[kind]
    const idx = list.findIndex((t) => t.id === id)
    if (idx !== -1) list.splice(idx, 1)
  }

  async function loadCaptionSegments(track: Track) {
    // Phase 1 mock: fabricate segments; Phase 2: fetch from backend via track/url
    const lang = track.lang || 'und'
    captionSegmentsByLang.value[lang] = [
      { id: '1', start: 0, end: 2.5, text: 'Hello world' },
      { id: '2', start: 2.5, end: 5.0, text: 'This is a translated caption.' },
      { id: '3', start: 5.0, end: 8.0, text: 'Edit me inline.' },
    ]
  }

  function updateCaptionSegment(id: string, patch: Partial<CaptionSegment>) {
    const lang = selectedCaptionLang.value || 'und'
    const arr = captionSegmentsByLang.value[lang] || []
    const i = arr.findIndex((s) => s.id === id)
    if (i !== -1) arr[i] = { ...arr[i], ...patch }
    captionSegmentsByLang.value[lang] = [...arr]
  }

  async function transcodeToHls() {
    // Phase 1 mock; Phase 2 integrate backend
    /* no-op */
  }

  function saveLocal() {
    try {
      localStorage.setItem(`media-editor:${mediaId}`, JSON.stringify(manifest.value))
    } catch {
      /* ignore */
    }
  }
  function loadLocal(): boolean {
    try {
      const raw = localStorage.getItem(`media-editor:${mediaId}`)
      if (!raw) return false
      const m = JSON.parse(raw) as Manifest
      manifest.value = m
      return true
    } catch {
      return false
    }
  }

  if (autoLoad) void load()

  return {
    // state
    media,
    loading,
    error,
    manifest,
    // selections
    selectedVideoId,
    selectedAudioId,
    selectedCaptionId,
    selectedCaptionLang,
    // derived
    sourceUrl,
    isHls,
    isMp4,
    tracksVideo,
    tracksAudio,
    tracksCaptions,
    captionsByLang,
    captionLangs,
    captionSegmentsByLang,
    currentCaptionSegments,
    // actions
    load,
    parseHls: loadFromUrl,
    transcodeToHls,
    selectVideo,
    selectAudio,
    selectCaption,
    setCaptionLang,
    loadCaptionSegments,
    updateCaptionSegment,
    addTrack,
    removeTrack,
    saveLocal,
    loadLocal,
  }
}
