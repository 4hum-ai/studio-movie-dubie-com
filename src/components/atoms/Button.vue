<template>
  <button
    :type="type"
    :disabled="disabled || loading"
    :class="buttonClasses"
    :aria-label="ariaLabel"
    :aria-disabled="disabled || loading"
    @click="handleClick"
  >
    <!-- Loading spinner -->
    <span
      v-if="loading"
      class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
      aria-hidden="true"
    />

    <!-- Icon only -->
    <Icon
      v-else-if="icon && !$slots.default"
      :name="icon"
      :class="iconClasses"
      aria-hidden="true"
    />

    <!-- Icon with text -->
    <template v-else-if="icon && $slots.default">
      <Icon :name="icon" :class="iconClasses" aria-hidden="true" />
      <span :class="textClasses">
        <slot />
      </span>
    </template>

    <!-- Text only -->
    <span v-else-if="$slots.default" :class="textClasses">
      <slot />
    </span>

    <!-- Fallback for accessibility -->
    <span v-else class="sr-only">Button</span>
  </button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Icon from './Icon.vue'

interface Props {
  /** Icon name from unplugin-icons */
  icon?: string
  /** Button variant */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'danger'
    | 'success'
    | 'warning'
    | 'ghost'
    | 'outline'
  /** Button size */
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** Button type */
  type?: 'button' | 'submit' | 'reset'
  /** Whether the button is disabled */
  disabled?: boolean
  /** Whether the button is in loading state */
  loading?: boolean
  /** Whether the button is rounded */
  rounded?: boolean
  /** Whether the button is full width */
  fullWidth?: boolean
  /** Custom CSS classes */
  customClass?: string
  /** ARIA label for accessibility */
  ariaLabel?: string
}

interface Emits {
  (e: 'click', event: MouseEvent): void
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'default',
  size: 'md',
  type: 'button',
  disabled: false,
  loading: false,
  rounded: false,
  fullWidth: false,
})

const emit = defineEmits<Emits>()

const ariaLabel = computed(() => {
  if (props.ariaLabel) return props.ariaLabel
  if (props.loading) return 'Loading...'
  return 'Button'
})

const buttonClasses = computed(() => {
  const base =
    'inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

  // Size classes
  const sizes = {
    xs: 'h-6 px-2 text-xs gap-1',
    sm: 'h-8 px-3 text-sm gap-1.5',
    md: 'h-9 px-4 text-sm gap-2',
    lg: 'h-10 px-5 text-base gap-2',
    xl: 'h-12 px-6 text-lg gap-2.5',
  }

  // Variant classes
  const variants = {
    default:
      'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600',
    primary:
      'bg-primary-600 text-white hover:bg-primary-700 focus:ring-primary-500 dark:bg-primary-600 dark:hover:bg-primary-700',
    secondary:
      'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500 dark:bg-gray-600 dark:hover:bg-gray-700',
    danger:
      'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 dark:bg-red-600 dark:hover:bg-red-700',
    success:
      'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500 dark:bg-green-600 dark:hover:bg-green-700',
    warning:
      'bg-yellow-600 text-white hover:bg-yellow-700 focus:ring-yellow-500 dark:bg-yellow-600 dark:hover:bg-yellow-700',
    ghost:
      'bg-transparent text-gray-700 hover:bg-gray-100 focus:ring-gray-500 dark:text-gray-300 dark:hover:bg-gray-800',
    outline:
      'bg-transparent border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-gray-500 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800',
  }

  // Shape classes
  const shape = props.rounded ? 'rounded-full' : 'rounded-md'

  // Width classes
  const width = props.fullWidth ? 'w-full' : ''

  // Custom classes
  const custom = props.customClass || ''

  return [base, sizes[props.size], variants[props.variant], shape, width, custom]
    .filter(Boolean)
    .join(' ')
})

const iconClasses = computed(() => {
  const sizes = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
    xl: 'h-6 w-6',
  }
  return sizes[props.size]
})

const textClasses = computed(() => {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg',
  }
  return sizes[props.size]
})

const handleClick = (event: MouseEvent) => {
  if (!props.disabled && !props.loading) {
    emit('click', event)
  }
}
</script>
