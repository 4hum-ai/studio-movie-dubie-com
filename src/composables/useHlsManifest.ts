import { ref } from 'vue'
import { useCdn } from '@/composables/useCdn'

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
      const res = await fetch(getCdnUrl(url))
      const text = await res.text()
      data.value = parseM3u8(text, url)
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

function parseM3u8(text: string, baseUrl: string): HlsParsed {
  const video: HlsTrack[] = []
  const audio: HlsTrack[] = []
  const captions: HlsTrack[] = []

  const lines = text.split(/\r?\n/)
  let lastStreamInf: string | null = null
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('#EXT-X-STREAM-INF')) {
      lastStreamInf = line
      const uri = lines[i + 1] || ''
      if (uri && !uri.startsWith('#')) {
        const resolution = (lastStreamInf.match(/RESOLUTION=([^,]+)/) || [])[1] || ''
        const label = resolution ? resolution.split('x')[1] + 'p' : 'Variant'
        video.push({ id: `v-${i}`, label, url: absolutize(baseUrl, uri), kind: 'video' })
      }
      continue
    }
    if (line.startsWith('#EXT-X-MEDIA')) {
      const typeMatch = line.match(/TYPE=([^,]+)/)
      const langMatch = line.match(/LANGUAGE="([^"]+)"/)
      const nameMatch = line.match(/NAME="([^"]+)"/)
      const uriMatch = line.match(/URI="([^"]+)"/)
      const kind = (typeMatch?.[1] || '').toLowerCase()
      const track = {
        id: `${kind}-${i}`,
        label: nameMatch?.[1] || kind,
        lang: langMatch?.[1],
        url: uriMatch ? absolutize(baseUrl, uriMatch[1]) : undefined,
        kind: kind as 'video' | 'audio' | 'captions',
      }
      if (kind === 'audio') audio.push(track as HlsTrack)
      else if (kind === 'subtitles') captions.push({ ...track, kind: 'captions' } as HlsTrack)
    }
  }
  return { video, audio, captions }
}

function absolutize(base: string, uri: string): string {
  try {
    return new URL(uri, base).toString()
  } catch {
    return uri
  }
}
