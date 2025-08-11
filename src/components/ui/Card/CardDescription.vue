<template>
  <p :class="cn('text-sm text-muted-foreground', className)">
    <slot />
  </p>
</template>

<script setup>
import { cn } from '@/lib/utils'

defineProps({
  className: {
    type: String,
    default: ''
  }
})
</script>