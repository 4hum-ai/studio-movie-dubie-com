import { ref } from 'vue'

export type CaptionSegment = {
  id: string
  start: number // seconds
  end: number // seconds
  text: string
}

export function useSubtitles() {
  const segments = ref<CaptionSegment[]>([])
  const error = ref<string | null>(null)

  function loadFromVtt(vtt: string) {
    try {
      segments.value = parseVtt(vtt)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to parse VTT'
    }
  }

  function loadFromSrt(srt: string) {
    try {
      segments.value = parseSrt(srt)
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to parse SRT'
    }
  }

  function toVtt(): string {
    return 'WEBVTT\n\n' + segments.value.map(segToVtt).join('\n\n')
  }

  function toSrt(): string {
    return segments.value
      .map(
        (s, idx) => `${idx + 1}\n${formatSrtTime(s.start)} --> ${formatSrtTime(s.end)}\n${s.text}`,
      )
      .join('\n\n')
  }

  function updateSegment(id: string, patch: Partial<CaptionSegment>) {
    const i = segments.value.findIndex((s) => s.id === id)
    if (i !== -1) {
      segments.value[i] = { ...segments.value[i], ...patch }
    }
  }

  return { segments, error, loadFromVtt, loadFromSrt, toVtt, toSrt, updateSegment }
}

function parseVtt(vtt: string): CaptionSegment[] {
  const lines = vtt.split(/\r?\n/)
  const out: CaptionSegment[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i].trim()
    if (!line || line.startsWith('WEBVTT')) {
      i++
      continue
    }
    const timeMatch = lines[i].match(
      /(\d{2}:\d{2}:\d{2}\.\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2}\.\d{3})/,
    )
    if (timeMatch) {
      const start = parseClock(timeMatch[1])
      const end = parseClock(timeMatch[2])
      const textLines: string[] = []
      i++
      while (i < lines.length && lines[i].trim() !== '') {
        textLines.push(lines[i])
        i++
      }
      out.push({ id: String(out.length + 1), start, end, text: textLines.join('\n') })
    }
    i++
  }
  return out
}

function parseSrt(srt: string): CaptionSegment[] {
  const blocks = srt.replace(/\r/g, '').split('\n\n')
  const out: CaptionSegment[] = []
  for (const block of blocks) {
    const lines = block.split('\n').filter(Boolean)
    if (lines.length < 2) continue
    const timeMatch = lines[1].match(/(\d{2}:\d{2}:\d{2},\d{3})\s+-->\s+(\d{2}:\d{2}:\d{2},\d{3})/)
    if (!timeMatch) continue
    const start = parseClock(timeMatch[1].replace(',', '.'))
    const end = parseClock(timeMatch[2].replace(',', '.'))
    const text = lines.slice(2).join('\n')
    out.push({ id: String(out.length + 1), start, end, text })
  }
  return out
}

function parseClock(clock: string): number {
  const [h, m, rest] = clock.split(':')
  const [s, ms] = rest.split('.')
  return Number(h) * 3600 + Number(m) * 60 + Number(s) + Number(ms) / 1000
}

function formatSrtTime(sec: number): string {
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  const ms = Math.round((sec - Math.floor(sec)) * 1000)
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`
}

function segToVtt(s: CaptionSegment): string {
  const fmt = (n: number) => {
    const h = Math.floor(n / 3600)
    const m = Math.floor((n % 3600) / 60)
    const sec = Math.floor(n % 60)
    const ms = Math.round((n - Math.floor(n)) * 1000)
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}.${String(ms).padStart(3, '0')}`
  }
  return `${fmt(s.start)} --> ${fmt(s.end)}\n${s.text}`
}
