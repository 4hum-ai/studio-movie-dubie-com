<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-gray-100">Caption Editor</h3>
      <div class="text-xs text-gray-500 dark:text-gray-400">{{ segments.length }} segments</div>
    </div>
    <div class="max-h-[50vh] space-y-2 overflow-auto">
      <div
        v-for="seg in segments"
        :key="seg.id"
        class="rounded border border-gray-200 bg-white p-2 dark:border-gray-700 dark:bg-gray-800"
      >
        <div class="mb-1 text-[11px] text-gray-500 dark:text-gray-400">
          {{ format(seg.start) }} - {{ format(seg.end) }}
        </div>
        <textarea
          class="w-full rounded border border-gray-300 bg-white p-2 text-sm text-gray-900 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          :value="seg.text"
          @input="onEdit(seg.id, ($event.target as HTMLTextAreaElement).value)"
          rows="2"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CaptionSegment } from '@/composables/useSubtitles'

interface Props {
  segments: CaptionSegment[]
}
const { segments } = defineProps<Props>()
const emit = defineEmits<{ update: [id: string, text: string] }>()

function onEdit(id: string, text: string) {
  emit('update', id, text)
}

function format(sec: number) {
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${String(s).padStart(2, '0')}`
}
</script>
