<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center">
    <div class="absolute inset-0 bg-black/50" @click="emit('close')" />
    <Card class="relative z-10 w-full max-w-xl">
      <div class="border-b border-gray-200 p-4 dark:border-gray-700">
        <h3 class="text-sm font-semibold">Select a Voice</h3>
      </div>
      <div class="max-h-[60vh] space-y-2 overflow-auto p-4">
        <div class="grid grid-cols-1 gap-2 md:grid-cols-2">
          <button
            v-for="v in voices"
            :key="v.id"
            type="button"
            class="flex items-center justify-between rounded border border-gray-200 p-3 text-left transition-colors hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
            @click="emit('select', v)"
          >
            <span class="text-sm">{{ v.name }}</span>
            <span class="text-xs text-gray-500">{{ v.provider }}</span>
          </button>
        </div>
      </div>
      <div
        class="flex items-center justify-end gap-2 border-t border-gray-200 p-3 dark:border-gray-700"
      >
        <Button size="sm" variant="ghost" @click="emit('close')">Close</Button>
      </div>
    </Card>
  </div>
</template>

<script setup lang="ts">
import Card from '@/components/atoms/Card.vue'
import Button from '@/components/atoms/Button.vue'

interface Voice {
  id: string
  name: string
  provider: string
}

interface Props {
  open: boolean
  voices: Voice[]
}

defineProps<Props>()
const emit = defineEmits<{ close: []; select: [voice: Voice] }>()
</script>
