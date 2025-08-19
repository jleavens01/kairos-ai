<template>
  <div :class="badgeClasses">
    <slot />
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { cn } from '@/lib/utils'

const props = defineProps({
  variant: {
    type: String,
    default: 'default',
    validator: (value) => ['default', 'secondary', 'destructive', 'outline', 'success', 'warning'].includes(value)
  },
  class: {
    type: String,
    default: ''
  }
})

const badgeClasses = computed(() => {
  const baseClasses = 'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
  
  const variantClasses = {
    default: 'border-transparent bg-primary text-primary-foreground',
    secondary: 'border-transparent bg-secondary text-secondary-foreground',
    destructive: 'border-transparent bg-destructive text-destructive-foreground',
    outline: 'text-foreground',
    success: 'border-transparent bg-green-500 text-white',
    warning: 'border-transparent bg-yellow-500 text-white'
  }
  
  return cn(
    baseClasses,
    variantClasses[props.variant],
    props.class
  )
})
</script>