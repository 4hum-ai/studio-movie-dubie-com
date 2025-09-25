<template>
  <div class="relative min-h-[300px] bg-black dark:bg-gray-900">
    <!-- Video Element with Native Controls -->
    <video
      ref="videoRef"
      class="h-auto w-full bg-black"
      :controls="showNativeControls"
      preload="metadata"
      @loadedmetadata="onLoadedMetadata"
      @timeupdate="onTimeUpdate"
      @ended="onEnded"
      @error="onError"
      @play="onPlay"
      @pause="onPause"
      @volumechange="onVolumeChange"
      @seeking="onSeeking"
      @seeked="onSeeked"
      @click="togglePlay"
    >
      <track
        v-if="subtitleUrl"
        kind="subtitles"
        :src="subtitleUrl"
        srclang="en"
        label="English"
        default
      />
      Your browser does not support the video tag.
    </video>

    <!-- Loading Overlay -->
    <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-black/50">
      <div class="flex flex-col items-center gap-3 text-white">
        <div
          class="h-8 w-8 animate-spin rounded-full border-2 border-white border-t-transparent"
        ></div>
        <span class="text-sm">Loading...</span>
      </div>
    </div>

    <!-- Large Play Button Overlay (when paused and not using native controls) -->
    <div
      v-if="!loading && !error && !showNativeControls && !isPlaying"
      class="absolute inset-0 flex cursor-pointer items-center justify-center bg-black/20"
      @click="togglePlay"
    >
      <div class="rounded-full bg-black/70 p-4 transition-colors hover:bg-black/80">
        <svg class="h-12 w-12 text-white" fill="currentColor" viewBox="0 0 24 24">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>
    </div>

    <!-- Error Overlay -->
    <div v-if="error" class="absolute inset-0 flex items-center justify-center bg-black/50">
      <div class="flex flex-col items-center gap-3 text-white">
        <svg class="h-12 w-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            stroke-width="2"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
          />
        </svg>
        <span class="text-center text-sm">{{ error }}</span>
        <button @click="retry" class="rounded-md bg-white/20 px-3 py-1 text-sm hover:bg-white/30">
          Retry
        </button>
      </div>
    </div>

    <!-- Custom Video Controls (Bottom Bar) -->
    <div
      v-show="!showNativeControls"
      class="absolute right-0 bottom-0 left-0 bg-gradient-to-t from-black/80 to-transparent p-4"
    >
      <div class="flex items-center justify-between">
        <!-- Left side controls -->
        <div class="flex items-center gap-3">
          <!-- Play/Pause Button -->
          <button
            @click="togglePlay"
            class="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
            aria-label="Play/Pause"
          >
            <svg v-if="!isPlaying" class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
            <svg v-else class="h-6 w-6" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
            </svg>
          </button>

          <!-- Time Display -->
          <div class="font-mono text-sm text-white">
            {{ formatTime(currentTime) }} / {{ formatTime(duration) }}
          </div>
        </div>

        <!-- Right side controls -->
        <div class="flex items-center gap-3">
          <!-- Volume Button -->
          <div class="relative">
            <button
              @click.stop="toggleVolumePanel"
              class="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
              :class="{ 'bg-blue-500': showVolumePanel }"
              aria-label="Volume"
            >
              <svg
                v-if="isMuted || volume === 0"
                class="h-5 w-5"
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"
                />
              </svg>
              <svg v-else-if="volume < 0.5" class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M3 9v6h4l5 5V4L7 9H3z" />
              </svg>
              <svg v-else class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
                />
              </svg>
            </button>
          </div>

          <!-- Audio Track Button -->
          <div class="relative" v-if="hasMultipleAudioTracks">
            <button
              @click.stop="toggleAudioPanel"
              class="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
              :class="{ 'bg-blue-500': showAudioPanel }"
              aria-label="Audio Track"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"
                />
              </svg>
            </button>
          </div>

          <!-- Video Quality Button -->
          <div class="relative" v-if="hasMultipleVideoTracks">
            <button
              @click.stop="toggleVideoPanel"
              class="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
              :class="{ 'bg-blue-500': showVideoPanel }"
              aria-label="Video Quality"
            >
              <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
                <path
                  d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7v6l5-3-5-3z"
                />
              </svg>
            </button>
          </div>

          <!-- Fullscreen Button -->
          <button
            @click="toggleFullscreen"
            class="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-white/30"
            aria-label="Fullscreen"
          >
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
              />
            </svg>
          </button>

          <!-- Close Button (for modal mode) -->
          <button
            v-if="mode === 'modal'"
            @click="emit('close')"
            class="rounded-full bg-white/20 p-2 text-white transition-colors hover:bg-red-500"
            aria-label="Close"
          >
            <svg class="h-5 w-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Volume Panel -->
    <div
      v-if="showVolumePanel"
      class="absolute right-4 bottom-16 z-50 min-w-[200px] rounded-lg bg-black/90 p-4 text-white backdrop-blur-sm"
    >
      <h3 class="mb-3 text-sm font-medium text-gray-300">Volume</h3>
      <div class="space-y-3">
        <!-- Volume Slider -->
        <div class="flex items-center gap-3">
          <svg class="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path d="M3 9v6h4l5 5V4L7 9H3z" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            :value="volume"
            @input="onVolumeSliderChange"
            class="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-gray-700"
          />
          <svg class="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
            <path
              d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"
            />
          </svg>
        </div>

        <!-- Volume Presets -->
        <div class="grid grid-cols-3 gap-2">
          <button
            @click="setVolume(0)"
            class="rounded px-2 py-1 text-xs transition-colors"
            :class="
              volume === 0
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            "
          >
            Mute
          </button>
          <button
            @click="setVolume(0.5)"
            class="rounded px-2 py-1 text-xs transition-colors"
            :class="
              volume === 0.5
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            "
          >
            50%
          </button>
          <button
            @click="setVolume(1)"
            class="rounded px-2 py-1 text-xs transition-colors"
            :class="
              volume === 1
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
            "
          >
            100%
          </button>
        </div>
      </div>
    </div>

    <!-- Audio Track Panel -->
    <div
      v-if="showAudioPanel"
      class="absolute right-4 bottom-16 z-50 min-w-[250px] rounded-lg bg-black/90 p-4 text-white backdrop-blur-sm"
    >
      <h3 class="mb-3 text-sm font-medium text-gray-300">Audio Track</h3>
      <div class="space-y-2">
        <button
          v-for="track in availableAudioTracks"
          :key="track.id"
          @click="switchAudioTrack(track.id)"
          class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors"
          :class="
            currentAudioTrack?.id === track.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          "
        >
          <div>
            <div class="text-sm font-medium">{{ track.label }}</div>
            <div v-if="track.lang" class="text-xs text-gray-400">{{ track.lang }}</div>
          </div>
          <div
            v-if="currentAudioTrack?.id === track.id"
            class="h-2 w-2 rounded-full bg-white"
          ></div>
        </button>
      </div>
    </div>

    <!-- Video Quality Panel -->
    <div
      v-if="showVideoPanel"
      class="absolute right-4 bottom-16 z-50 min-w-[200px] rounded-lg bg-black/90 p-4 text-white backdrop-blur-sm"
    >
      <h3 class="mb-3 text-sm font-medium text-gray-300">Video Quality</h3>
      <div class="space-y-2">
        <button
          v-for="track in availableVideoTracks"
          :key="track.id"
          @click="switchVideoTrack(track.id)"
          class="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-colors"
          :class="
            currentVideoTrack?.id === track.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-700 text-gray-200 hover:bg-gray-600'
          "
        >
          <div>
            <div class="text-sm font-medium">{{ track.label }}</div>
          </div>
          <div
            v-if="currentVideoTrack?.id === track.id"
            class="h-2 w-2 rounded-full bg-white"
          ></div>
        </button>
      </div>
    </div>

    <!-- Subtitle Overlay -->
    <div
      v-if="subtitleUrl && subtitlesEnabled && currentSubtitle"
      class="absolute bottom-20 left-1/2 -translate-x-1/2 transform text-center"
    >
      <div class="max-w-2xl rounded-lg bg-black/70 px-4 py-2 text-lg text-white">
        {{ currentSubtitle }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, watch, computed, nextTick } from 'vue'
import { useCdn } from '@/composables/useCdn'
import Hls from 'hls.js'

interface Props {
  url: string
  title?: string
  subtitleUrl?: string
  audioTracks?: Array<{ id: string; label: string; lang?: string; url?: string }>
  videoTracks?: Array<{ id: string; label: string; url?: string }>
  selectedAudioId?: string
  selectedVideoId?: string
  mode: 'modal' | 'inline'
  useNativeControls?: boolean
}

const props = defineProps<Props>()
// emit is used in the template for close button
const emit = defineEmits<{
  close: []
  'audio-track-change': [trackId: string]
  'video-track-change': [trackId: string]
}>()

// CDN composable
const { getCdnUrl } = useCdn()

// Refs
const videoRef = ref<HTMLVideoElement>()

// State
const loading = ref(true)
const error = ref('')
const isPlaying = ref(false)
const isMuted = ref(false)
const isFullscreen = ref(false)
const isSeeking = ref(false)
const showControls = ref(true)
const subtitlesEnabled = ref(true)
const isPipMode = ref(false)

// Panel states
const showVolumePanel = ref(false)
const showAudioPanel = ref(false)
const showVideoPanel = ref(false)

// Video state
const currentTime = ref(0)
const duration = ref(0)
const volume = ref(1)
const progress = ref(0)
const currentSubtitle = ref('')

// HLS instance
let hls: Hls | null = null

// Track state
const currentAudioTrackId = ref<string | null>(null)
const currentVideoTrackId = ref<string | null>(null)

// Playback speeds

// Computed
const isHLS = computed(() => props.url.includes('.m3u8') || props.url.includes('.m3u'))

// Transform video URL to use CDN
const cdnVideoUrl = computed(() => {
  if (!props.url) return ''
  return getCdnUrl(props.url)
})

// Control visibility
const showNativeControls = computed(() => props.useNativeControls === true)

// Audio track computed properties
const availableAudioTracks = computed(() => props.audioTracks || [])
const hasMultipleAudioTracks = computed(() => availableAudioTracks.value.length > 1)
const currentAudioTrack = computed(() => {
  const trackId = currentAudioTrackId.value || props.selectedAudioId
  return (
    availableAudioTracks.value.find((track) => track.id === trackId) ||
    availableAudioTracks.value[0]
  )
})

// Video track computed properties
const availableVideoTracks = computed(() => props.videoTracks || [])
const hasMultipleVideoTracks = computed(() => availableVideoTracks.value.length > 1)
const currentVideoTrack = computed(() => {
  const trackId = currentVideoTrackId.value || props.selectedVideoId
  return (
    availableVideoTracks.value.find((track) => track.id === trackId) ||
    availableVideoTracks.value[0]
  )
})

// Methods
const initializeVideo = async () => {
  if (!videoRef.value) {
    await nextTick()
    if (!videoRef.value) {
      return
    }
  }

  const video = videoRef.value
  loading.value = true
  error.value = ''

  try {
    if (isHLS.value && Hls.isSupported()) {
      // Initialize HLS
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        // Force audio track detection
        forceKeyFrameOnDiscontinuity: true,
        // Enable audio track switching
        enableSoftwareAES: true,
        // Debug mode to see what's happening
        debug: true,
      })

      // Debug: Log the manifest URL and content
      console.log('Loading HLS from URL:', cdnVideoUrl.value)

      // Try to fetch and log the actual manifest content
      fetch(cdnVideoUrl.value)
        .then((response) => response.text())
        .then((manifestText) => {
          console.log('Raw HLS manifest content:')
          console.log(manifestText)
        })
        .catch((err) => console.log('Could not fetch manifest for debugging:', err))

      hls.loadSource(cdnVideoUrl.value)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        loading.value = false
        console.log('HLS manifest parsed')
        console.log('Available audio tracks from hls.js:', hls?.audioTracks)
        console.log('Available audio tracks from props:', availableAudioTracks.value)
        console.log('Current audio track index:', hls?.audioTrack)
        console.log(
          'Video element audio tracks:',
          (video as HTMLVideoElement & { audioTracks?: unknown }).audioTracks,
        )
        console.log('HLS levels (video tracks):', hls?.levels)

        // Debug: Try to manually create audio tracks if hls.js didn't detect them
        if (
          hls?.audioTracks &&
          hls.audioTracks.length === 0 &&
          availableAudioTracks.value.length > 0
        ) {
          console.log('HLS.js did not detect audio tracks, but we have them in props')
          console.log('This suggests the m3u8-parser found audio tracks but hls.js did not')
          console.log('Available audio tracks from m3u8-parser:', availableAudioTracks.value)

          // The issue might be that hls.js needs the audio tracks to be loaded differently
          // Let's try to manually trigger audio track loading by fetching the audio playlists
          availableAudioTracks.value.forEach((track, index) => {
            console.log(`Audio track ${index}:`, track)
            if (track.url) {
              // Try to fetch the audio playlist to see if it's accessible
              fetch(track.url)
                .then((response) => response.text())
                .then((audioPlaylist) => {
                  console.log(`Audio playlist ${index} content:`, audioPlaylist)
                })
                .catch((err) => console.log(`Could not fetch audio playlist ${index}:`, err))
            }
          })
        }

        // Wait a bit and check audio tracks again (sometimes they load after manifest parsing)
        setTimeout(() => {
          console.log('Delayed audio tracks check:', hls?.audioTracks)
          if (hls?.audioTracks && hls.audioTracks.length > 0) {
            console.log('Audio tracks found after delay!')
          }
        }, 1000)

        // Set initial audio track if one is selected
        if (props.selectedAudioId && hls?.audioTracks && hls.audioTracks.length > 0) {
          console.log('Setting initial audio track:', props.selectedAudioId)
          switchAudioTrack(props.selectedAudioId)
        }

        // Ensure video element is not muted and has proper audio settings
        video.muted = false
        video.volume = 1
        console.log('Video element muted:', video.muted)
        console.log('Video element volume:', video.volume)

        // Don't autoplay, just set loading to false
        loading.value = false
      })

      // Add audio track change event listener
      hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
        console.log('Audio tracks updated:', hls?.audioTracks)
      })

      hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, (_event, data) => {
        console.log('Audio track switched:', data)
      })

      hls.on(Hls.Events.AUDIO_TRACK_LOADED, (_event, data) => {
        console.log('Audio track loaded:', data)
      })

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          error.value = `HLS Error: ${data.details}`
          loading.value = false
        }
      })
    } else {
      // Standard video
      video.src = cdnVideoUrl.value
      video.load()

      video.onloadeddata = () => {
        loading.value = false
      }

      video.onerror = () => {
        error.value = 'Failed to load video'
        loading.value = false
      }
    }
  } catch (err) {
    error.value = `Failed to initialize video: ${err instanceof Error ? err.message : 'Unknown error'}`
    loading.value = false
  }
}

const togglePlay = () => {
  if (!videoRef.value) return

  if (isPlaying.value) {
    videoRef.value.pause()
  } else {
    videoRef.value.play()
  }
}

const toggleMute = () => {
  if (!videoRef.value) return

  videoRef.value.muted = !videoRef.value.muted
  isMuted.value = videoRef.value.muted
}

const toggleVolumePanel = () => {
  showVolumePanel.value = !showVolumePanel.value
  // Close other panels
  showAudioPanel.value = false
  showVideoPanel.value = false
}

const toggleAudioPanel = () => {
  showAudioPanel.value = !showAudioPanel.value
  // Close other panels
  showVolumePanel.value = false
  showVideoPanel.value = false
}

const toggleVideoPanel = () => {
  showVideoPanel.value = !showVideoPanel.value
  // Close other panels
  showVolumePanel.value = false
  showAudioPanel.value = false
}

const formatTime = (seconds: number): string => {
  if (!isFinite(seconds)) return '0:00'

  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const onVolumeSliderChange = (event: Event) => {
  const target = event.target as HTMLInputElement
  const newVolume = parseFloat(target.value)
  setVolume(newVolume)
}

const setVolume = (newVolume: number) => {
  if (!videoRef.value) return

  volume.value = newVolume
  videoRef.value.volume = newVolume
  videoRef.value.muted = newVolume === 0
  isMuted.value = newVolume === 0
}

const switchVideoTrack = (trackId: string) => {
  if (!videoRef.value) return

  currentVideoTrackId.value = trackId
  emit('video-track-change', trackId)

  if (isHLS.value && hls) {
    // For HLS, switch video quality using hls.js
    const selectedTrack = availableVideoTracks.value.find((track) => track.id === trackId)
    if (selectedTrack) {
      console.log('Switching to video track:', selectedTrack)

      // Find the matching HLS level
      const levelIndex = hls.levels.findIndex((level) => {
        return (
          (Array.isArray(level.url) ? level.url[0] : level.url) === selectedTrack.url ||
          (level.height &&
            selectedTrack.label &&
            level.height.toString() === selectedTrack.label.replace('p', ''))
        )
      })

      if (levelIndex !== -1) {
        console.log('Switching to HLS level:', levelIndex)
        hls.currentLevel = levelIndex
      } else {
        console.log('Could not find matching HLS level')
      }
    }
  } else {
    // For regular video, switch the source
    const selectedTrack = availableVideoTracks.value.find((track) => track.id === trackId)
    if (selectedTrack && selectedTrack.url) {
      videoRef.value.src = getCdnUrl(selectedTrack.url)
      videoRef.value.load()
    }
  }
}

const switchAudioTrack = (trackId: string) => {
  if (!videoRef.value) return

  currentAudioTrackId.value = trackId
  emit('audio-track-change', trackId)

  if (isHLS.value && hls) {
    // For HLS, switch audio track using hls.js
    const audioTracks = hls.audioTracks
    console.log('Available HLS audio tracks:', audioTracks)
    console.log('Trying to switch to track ID:', trackId)

    // Find the track by matching the label or URL
    const selectedTrack = availableAudioTracks.value.find((track) => track.id === trackId)
    if (selectedTrack) {
      console.log('Selected track from manifest:', selectedTrack)

      // Try to find matching HLS track by label or URL
      const hlsTrackIndex = audioTracks.findIndex((hlsTrack) => {
        return (
          hlsTrack.name === selectedTrack.label ||
          hlsTrack.url === selectedTrack.url ||
          String(hlsTrack.id) === String(trackId)
        )
      })

      if (hlsTrackIndex !== -1) {
        console.log('Switching to HLS audio track index:', hlsTrackIndex)
        hls.audioTrack = Number(hlsTrackIndex)

        // Ensure video is not muted after switching
        if (videoRef.value) {
          videoRef.value.muted = false
          videoRef.value.volume = 1
          console.log('Audio track switched, video unmuted')
        }
      } else {
        console.log('Could not find matching HLS audio track')
        // Fallback: try to find by index if trackId contains a number
        const indexMatch = trackId.match(/(\d+)$/)
        if (indexMatch) {
          const index = parseInt(indexMatch[1])
          if (index >= 0 && index < audioTracks.length) {
            console.log('Using fallback index:', index)
            hls.audioTrack = Number(index)

            // Ensure video is not muted after switching
            if (videoRef.value) {
              videoRef.value.muted = false
              videoRef.value.volume = 1
              console.log('Audio track switched via fallback, video unmuted')
            }
          }
        }
      }
    }
  } else {
    // For regular video, we would need to handle this differently
    // This would typically involve switching the video source or using multiple audio elements
    console.log('Audio track switching for non-HLS video not yet implemented')
  }
}

const togglePip = async () => {
  if (!videoRef.value) return

  try {
    if (!isPipMode.value) {
      // Enter PiP mode
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
      }
      if (videoRef.value.requestPictureInPicture) {
        await videoRef.value.requestPictureInPicture()
        isPipMode.value = true
      }
    } else {
      // Exit PiP mode
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture()
        isPipMode.value = false
      }
    }
  } catch (error) {
    console.warn('PiP not supported or failed:', error)
  }
}

const toggleFullscreen = () => {
  if (!videoRef.value) return

  if (!isFullscreen.value) {
    if (videoRef.value.requestFullscreen) {
      videoRef.value.requestFullscreen()
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen()
    }
  }
}

const retry = () => {
  error.value = ''
  initializeVideo()
}

// Event handlers
const onLoadedMetadata = () => {
  if (!videoRef.value) return

  duration.value = videoRef.value.duration
  volume.value = videoRef.value.volume
  isMuted.value = videoRef.value.muted
  loading.value = false
}

const onTimeUpdate = () => {
  if (!videoRef.value || isSeeking.value) return

  currentTime.value = videoRef.value.currentTime
  progress.value = (currentTime.value / duration.value) * 100
}

const onPlay = () => {
  isPlaying.value = true
  showControls.value = true
}

const onPause = () => {
  isPlaying.value = false
  showControls.value = true
}

const onEnded = () => {
  isPlaying.value = false
  currentTime.value = 0
  progress.value = 0
}

const onError = () => {
  error.value = 'Video playback error'
  loading.value = false
}

const onSeeking = () => {
  isSeeking.value = true
}

const onSeeked = () => {
  isSeeking.value = false
}

const onVolumeChange = () => {
  if (!videoRef.value) return

  volume.value = videoRef.value.volume
  isMuted.value = videoRef.value.muted
}

// Fullscreen change listener
const onFullscreenChange = () => {
  isFullscreen.value = !!document.fullscreenElement
}

// PiP change listener
const onPipChange = () => {
  isPipMode.value = !!document.pictureInPictureElement
}

// Watch for URL changes
watch(
  () => props.url,
  () => {
    if (props.url) {
      initializeVideo()
    }
  },
)

// Watch for selectedAudioId changes
watch(
  () => props.selectedAudioId,
  (newAudioId) => {
    if (newAudioId && newAudioId !== currentAudioTrackId.value) {
      switchAudioTrack(newAudioId)
    }
  },
)

// Watch for selectedVideoId changes
watch(
  () => props.selectedVideoId,
  (newVideoId) => {
    if (newVideoId && newVideoId !== currentVideoTrackId.value) {
      switchVideoTrack(newVideoId)
    }
  },
)

// Close panels when clicking outside
const handleClickOutside = (event: Event) => {
  const target = event.target as HTMLElement

  // Don't close if clicking on panel buttons or panels themselves
  if (
    target.closest('button[aria-label="Volume"]') ||
    target.closest('button[aria-label="Audio Track"]') ||
    target.closest('button[aria-label="Video Quality"]') ||
    target.closest('.absolute.bottom-16.right-4')
  ) {
    return
  }

  // Close all panels
  showVolumePanel.value = false
  showAudioPanel.value = false
  showVideoPanel.value = false
}

// Lifecycle
onMounted(async () => {
  await nextTick()
  if (props.url) {
    initializeVideo()
  }

  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('enterpictureinpicture', onPipChange)
  document.addEventListener('leavepictureinpicture', onPipChange)
  document.addEventListener('click', handleClickOutside)

  // Keyboard shortcuts
  const handleKeydown = (event: KeyboardEvent) => {
    if (!videoRef.value) return

    switch (event.code) {
      case 'Space':
        event.preventDefault()
        togglePlay()
        break
      case 'ArrowLeft':
        event.preventDefault()
        videoRef.value.currentTime = Math.max(0, videoRef.value.currentTime - 10)
        break
      case 'ArrowRight':
        event.preventDefault()
        videoRef.value.currentTime = Math.min(duration.value, videoRef.value.currentTime + 10)
        break
      case 'KeyM':
        event.preventDefault()
        toggleMute()
        break
      case 'KeyF':
        event.preventDefault()
        toggleFullscreen()
        break
      case 'KeyP':
        event.preventDefault()
        togglePip()
        break
    }
  }

  document.addEventListener('keydown', handleKeydown)

  onBeforeUnmount(() => {
    document.removeEventListener('fullscreenchange', onFullscreenChange)
    document.removeEventListener('enterpictureinpicture', onPipChange)
    document.removeEventListener('leavepictureinpicture', onPipChange)
    document.removeEventListener('click', handleClickOutside)
    document.removeEventListener('keydown', handleKeydown)

    if (hls) {
      hls.destroy()
      hls = null
    }
  })
})
</script>

<style scoped>
/* Custom range input styling */
input[type='range']::-webkit-slider-thumb {
  appearance: none;
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
}

input[type='range']::-moz-range-thumb {
  height: 12px;
  width: 12px;
  border-radius: 50%;
  background: white;
  cursor: pointer;
  border: none;
}
</style>
