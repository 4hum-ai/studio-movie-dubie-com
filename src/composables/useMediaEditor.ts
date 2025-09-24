import { ref, computed } from 'vue'
import { useResourceService } from '@/composables/useResourceService'
import { useHlsManifest } from '@/composables/useHlsManifest'
import { useGoogleWorkflow } from '@/composables/useGoogleWorkflow'

export type Track = {
  id: string
  label: string
  kind: 'video' | 'audio' | 'captions'
  url?: string
  lang?: string
}

export type Manifest = { video: Track[]; audio: Track[]; captions: Track[] }

export type CaptionSegment = { id: string; start: number; end: number; text: string }

export type VideoTier = {
  name: string
  resolution: string
  bitrate: string
  codec: string
  profile: string
}

export type AudioTier = {
  name: string
  bitrate: string
  codec: string
  channels: number
}

export type SpriteConfig = {
  enabled: boolean
  width: number
  height: number
  interval: number
  columns: number
  rows: number
}

export type TranscodeJob = {
  id: string
  label: string
  progress: number
  status: 'pending' | 'running' | 'completed' | 'failed'
  workflowExecutionId?: string
}

export function useMediaEditor(mediaId: string, options: { autoLoad?: boolean } = {}) {
  const { autoLoad = true } = options

  const api = useResourceService()
  const { data: hlsData, loadFromUrl } = useHlsManifest()
  const workflowApi = useGoogleWorkflow()

  // Core state
  const media = ref<Record<string, unknown> | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)
  const manifest = ref<Manifest>({ video: [], audio: [], captions: [] })

  // Transcoding state
  const transcodingJobs = ref<TranscodeJob[]>([])
  const isTranscoding = ref(false)

  // Default transcoding configuration
  const defaultVideoTiers: VideoTier[] = [
    {
      name: '1080p',
      resolution: '1920x1080',
      bitrate: '4000k',
      codec: 'h264',
      profile: 'high',
    },
    {
      name: '720p',
      resolution: '1280x720',
      bitrate: '2000k',
      codec: 'h264',
      profile: 'main',
    },
    {
      name: '480p',
      resolution: '854x480',
      bitrate: '1000k',
      codec: 'h264',
      profile: 'main',
    },
    {
      name: '360p',
      resolution: '640x360',
      bitrate: '500k',
      codec: 'h264',
      profile: 'baseline',
    },
  ]

  const defaultAudioTiers: AudioTier[] = [
    {
      name: 'high',
      bitrate: '192k',
      codec: 'aac',
      channels: 2,
    },
    {
      name: 'medium',
      bitrate: '128k',
      codec: 'aac',
      channels: 2,
    },
    {
      name: 'low',
      bitrate: '96k',
      codec: 'aac',
      channels: 2,
    },
  ]

  const defaultSpriteConfig: SpriteConfig = {
    enabled: true,
    width: 160,
    height: 90,
    interval: 10,
    columns: 10,
    rows: 10,
  }

  // Selections (two-way friendly)
  const selectedVideoId = ref<string | null>(null)
  const selectedAudioId = ref<string | null>(null)
  const selectedCaptionId = ref<string | null>(null)
  const selectedCaptionLang = ref<string | null>(null)

  // Captions model by language
  const captionSegmentsByLang = ref<Record<string, CaptionSegment[]>>({})

  // Derived
  const isHls = computed(() => {
    const masterUrl = String(media.value?.fileUrl || media.value?.url || '')
    return /\.m3u8(\?|$)/i.test(masterUrl)
  })
  const isMp4 = computed(() => {
    const masterUrl = String(media.value?.fileUrl || media.value?.url || '')
    return /\.mp4(\?|$)/i.test(masterUrl)
  })
  const sourceUrl = computed(() => {
    // For HLS with audio tracks, use the master playlist URL (media.fileUrl)
    // For MP4 or HLS without audio tracks, use the first video track URL
    console.log(
      'sourceUrl computed - isHls:',
      isHls.value,
      'audio.length:',
      manifest.value.audio.length,
    )
    console.log('media.value:', media.value)
    console.log('master URL:', media.value?.fileUrl || media.value?.url || '')
    console.log('video track URL:', manifest.value.video[0]?.url || '')

    if (isHls.value && manifest.value.audio.length > 0) {
      const masterUrl = String(media.value?.fileUrl || media.value?.url || '')
      console.log('Using master URL:', masterUrl)
      return masterUrl
    }
    const videoUrl = String(manifest.value.video[0]?.url || '')
    console.log('Using video URL:', videoUrl)
    return videoUrl
  })

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

  async function transcodeToHls(
    options: {
      videoTiers?: VideoTier[]
      audioTiers?: AudioTier[]
      spriteConfig?: SpriteConfig
    } = {},
  ) {
    if (!mediaId || isTranscoding.value) return

    const jobId = `transcode-${Date.now()}`
    const job: TranscodeJob = {
      id: jobId,
      label: 'Transcoding to HLS',
      progress: 0,
      status: 'pending',
    }

    transcodingJobs.value.push(job)
    isTranscoding.value = true

    try {
      // Build workflow arguments
      const workflowArgs = {
        source_media_id: mediaId,
        video_tiers: options.videoTiers || defaultVideoTiers,
        audio_tiers: options.audioTiers || defaultAudioTiers,
        sprite_config: options.spriteConfig || defaultSpriteConfig,
      }

      // Update job status
      const jobIndex = transcodingJobs.value.findIndex((j) => j.id === jobId)
      if (jobIndex !== -1) {
        transcodingJobs.value[jobIndex].status = 'running'
        transcodingJobs.value[jobIndex].progress = 10
      }

      // Execute the workflow
      const execution = await workflowApi.createExecution('transcode-to-hls-inplace', workflowArgs)

      // Update job with execution ID
      if (jobIndex !== -1) {
        transcodingJobs.value[jobIndex].workflowExecutionId = execution.name.split('/').pop() || ''
        transcodingJobs.value[jobIndex].progress = 20
      }

      // Start monitoring the execution
      monitorTranscodeExecution(execution.name.split('/').pop() || '', jobId)
    } catch (err) {
      // Update job status to failed
      const jobIndex = transcodingJobs.value.findIndex((j) => j.id === jobId)
      if (jobIndex !== -1) {
        transcodingJobs.value[jobIndex].status = 'failed'
        transcodingJobs.value[jobIndex].progress = 0
      }

      error.value = (err as Error)?.message || 'Failed to start transcoding workflow'
      isTranscoding.value = false
      throw err
    }
  }

  async function monitorTranscodeExecution(executionId: string, jobId: string) {
    const jobIndex = transcodingJobs.value.findIndex((j) => j.id === jobId)
    if (jobIndex === -1) return

    const checkStatus = async () => {
      try {
        const execution = await workflowApi.getExecution('transcode-to-hls-inplace', executionId)

        if (execution.state === 'SUCCEEDED') {
          // Update job to completed
          transcodingJobs.value[jobIndex].status = 'completed'
          transcodingJobs.value[jobIndex].progress = 100
          isTranscoding.value = false

          // Reload the media to get updated manifest
          await load()
          return
        }

        if (execution.state === 'FAILED') {
          // Update job to failed
          transcodingJobs.value[jobIndex].status = 'failed'
          transcodingJobs.value[jobIndex].progress = 0
          isTranscoding.value = false
          error.value = execution.error?.message || 'Transcoding workflow failed'
          return
        }

        if (execution.state === 'CANCELLED') {
          // Update job to failed
          transcodingJobs.value[jobIndex].status = 'failed'
          transcodingJobs.value[jobIndex].progress = 0
          isTranscoding.value = false
          error.value = 'Transcoding workflow was cancelled'
          return
        }

        // Still running, update progress and check again
        if (execution.state === 'ACTIVE') {
          transcodingJobs.value[jobIndex].progress = Math.min(
            90,
            transcodingJobs.value[jobIndex].progress + 10,
          )
          setTimeout(checkStatus, 5000) // Check again in 5 seconds
        }
      } catch (err) {
        // Update job to failed on monitoring error
        transcodingJobs.value[jobIndex].status = 'failed'
        transcodingJobs.value[jobIndex].progress = 0
        isTranscoding.value = false
        error.value = (err as Error)?.message || 'Failed to monitor transcoding progress'
      }
    }

    // Start monitoring
    setTimeout(checkStatus, 2000) // First check after 2 seconds
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
    // transcoding state
    transcodingJobs,
    isTranscoding,
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
