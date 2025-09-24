import { ref } from 'vue'
import { useCdn } from '@/composables/useCdn'
import { Parser } from 'm3u8-parser'

export type HlsTrack = {
  id: string
  label: string
  lang?: string
  url?: string
  kind: 'video' | 'audio' | 'captions'
}

export type HlsParsed = {
  video: HlsTrack[]
  audio: HlsTrack[]
  captions: HlsTrack[]
}

export function useHlsManifest() {
  const loading = ref(false)
  const error = ref<string | null>(null)
  const data = ref<HlsParsed>({ video: [], audio: [], captions: [] })
  const { getCdnUrl } = useCdn()

  async function loadFromUrl(url: string) {
    loading.value = true
    error.value = null
    try {
      console.log('useHlsManifest: Loading from URL:', url)
      const res = await fetch(getCdnUrl(url))
      const text = await res.text()
      console.log('useHlsManifest: Raw manifest content:', text)
      data.value = parseM3u8WithParser(text, url)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to load manifest'
      data.value = { video: [], audio: [], captions: [] }
    } finally {
      loading.value = false
    }
  }

  function loadFromMock(mock: HlsParsed) {
    data.value = mock
    loading.value = false
    error.value = null
  }

  return { loading, error, data, loadFromUrl, loadFromMock }
}

function parseM3u8WithParser(text: string, baseUrl: string): HlsParsed {
  const video: HlsTrack[] = []
  const audio: HlsTrack[] = []
  const captions: HlsTrack[] = []

  // First, try to parse audio tracks directly from the raw manifest
  // since m3u8-parser merges tracks with the same name
  console.log('Parsing audio tracks directly from raw manifest...')
  const lines = text.split(/\r?\n/)
  let audioIndex = 0

  for (const line of lines) {
    if (line.startsWith('#EXT-X-MEDIA:TYPE=AUDIO')) {
      console.log('Found audio track line:', line)

      // Parse the audio track attributes
      const typeMatch = line.match(/TYPE=([^,]+)/)
      const nameMatch = line.match(/NAME="([^"]+)"/)
      const uriMatch = line.match(/URI="([^"]+)"/)
      const langMatch = line.match(/LANGUAGE="([^"]+)"/)

      if (typeMatch?.[1]?.toLowerCase() === 'audio' && uriMatch) {
        // Create a better label for audio tracks
        let label = nameMatch?.[1] || 'Audio'
        const uri = uriMatch[1]

        // Extract quality from URI (e.g., "audio-high.m3u8" -> "High")
        const qualityMatch = uri.match(/audio-([^.]+)\.m3u8/)
        if (qualityMatch) {
          const quality = qualityMatch[1].charAt(0).toUpperCase() + qualityMatch[1].slice(1)
          label = `${nameMatch?.[1] || 'Audio'} (${quality})`
        }

        audio.push({
          id: `audio-${audioIndex + 1}`,
          label,
          lang: langMatch?.[1],
          url: absolutize(baseUrl, uri),
          kind: 'audio',
        })

        console.log(`Added audio track ${audioIndex + 1}:`, {
          id: `audio-${audioIndex + 1}`,
          label,
          lang: langMatch?.[1],
          url: absolutize(baseUrl, uri),
        })

        audioIndex++
      }
    }
  }

  // Now use m3u8-parser for video tracks and other data
  const parser = new Parser()
  parser.push(text)
  parser.end()

  const parsed = parser.manifest

  console.log('Parsed manifest with m3u8-parser:', parsed)
  console.log('Parsed manifest mediaGroups:', parsed.mediaGroups)
  console.log('Parsed manifest playlists:', parsed.playlists)

  // Parse video tracks (levels)
  if (parsed.playlists) {
    parsed.playlists.forEach((playlist, index) => {
      const resolution = playlist.attributes?.RESOLUTION
      const label = resolution ? `${resolution.height}p` : `Variant ${index + 1}`
      video.push({
        id: `v-${index}`,
        label,
        url: absolutize(baseUrl, playlist.uri),
        kind: 'video',
      })
    })
  }

  // Parse other media tracks (subtitles) from m3u8-parser
  console.log('Checking for other media tracks in mediaGroups...')
  console.log('parsed.mediaGroups:', parsed.mediaGroups)

  if (parsed.mediaGroups?.SUBTITLES) {
    console.log('Found SUBTITLES mediaGroups, processing...')
    Object.entries(parsed.mediaGroups.SUBTITLES).forEach(([_groupId, mediaList]) => {
      console.log('Processing subtitle group:', _groupId, 'mediaList:', mediaList)

      // Handle both array and object structures
      let mediaItems: Record<string, unknown>[] = []
      if (Array.isArray(mediaList)) {
        mediaItems = mediaList
      } else if (typeof mediaList === 'object') {
        mediaItems = Object.values(mediaList)
      }

      mediaItems.forEach((media: Record<string, unknown>, index: number) => {
        const type = String(media.type || '').toLowerCase()
        if (type === 'subtitles') {
          captions.push({
            id: `caption-${index}`,
            label: String(media.name || 'Subtitles'),
            lang: media.language as string | undefined,
            url: media.uri ? absolutize(baseUrl, String(media.uri)) : undefined,
            kind: 'captions',
          })
        }
      })
    })
  }

  console.log('Parsed tracks:', { video, audio, captions })
  return { video, audio, captions }
}

function absolutize(base: string, uri: string): string {
  try {
    return new URL(uri, base).toString()
  } catch {
    return uri
  }
}
