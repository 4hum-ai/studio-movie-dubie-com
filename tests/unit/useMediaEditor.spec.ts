import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useMediaEditor } from '@/composables/useMediaEditor'

// Minimal mock for useResourceService via module mock (optional: rely on real if test env available)
vi.mock('@/composables/useResourceService', () => {
  return {
    useResourceService: () => ({
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      getById: async (_res: string, _id: string) => ({
        fileUrl: 'https://example.com/video/sample.m3u8',
        format: 'm3u8',
        contentType: 'application/vnd.apple.mpegurl',
      }),
    }),
  }
})

vi.mock('@/composables/useHlsManifest', () => {
  const data = {
    value: {
      video: [{ id: 'v1', label: 'v1', url: 'https://example.com/v1.m3u8' }],
      audio: [],
      captions: [],
    },
  }
  return {
    useHlsManifest: () => ({ data, loadFromUrl: async () => void 0 }),
  }
})

describe('useMediaEditor', () => {
  beforeEach(() => {
    // reset localStorage for isolation
    localStorage.clear()
  })

  it('detects HLS and builds manifest', async () => {
    const editor = useMediaEditor('media-1', { autoLoad: false })
    await editor.load()
    expect(editor.isHls.value).toBe(true)
    expect(editor.tracksVideo.value.length).toBeGreaterThan(0)
    expect(editor.sourceUrl.value).toContain('m3u8')
  })

  it('supports local save/load', async () => {
    const editor = useMediaEditor('media-2', { autoLoad: false })
    editor.manifest.value = {
      video: [{ id: 'v', label: 'v', kind: 'video', url: 'x' }],
      audio: [],
      captions: [],
    }
    editor.saveLocal()
    const re = useMediaEditor('media-2', { autoLoad: false })
    const loaded = re.loadLocal()
    expect(loaded).toBe(true)
    expect(re.manifest.value.video[0]?.id).toBe('v')
  })
})
