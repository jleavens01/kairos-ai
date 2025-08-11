<template>
  <div :class="cn('rounded-lg border bg-card text-card-foreground shadow-sm', $attrs.class)">
    <slot />
  </div>
</template>

<script setup>
import { cn } from '@/lib/utils'
</script>

<script>
export const CardHeader = {
  name: 'CardHeader',
  template: `
    <div :class="cn('flex flex-col space-y-1.5 p-6', $attrs.class)">
      <slot />
    </div>
  `,
  setup() {
    return { cn }
  }
}

export const CardTitle = {
  name: 'CardTitle',
  template: `
    <h3 :class="cn('text-2xl font-semibold leading-none tracking-tight', $attrs.class)">
      <slot />
    </h3>
  `,
  setup() {
    return { cn }
  }
}

export const CardDescription = {
  name: 'CardDescription',
  template: `
    <p :class="cn('text-sm text-muted-foreground', $attrs.class)">
      <slot />
    </p>
  `,
  setup() {
    return { cn }
  }
}

export const CardContent = {
  name: 'CardContent',
  template: `
    <div :class="cn('p-6 pt-0', $attrs.class)">
      <slot />
    </div>
  `,
  setup() {
    return { cn }
  }
}

export const CardFooter = {
  name: 'CardFooter',
  template: `
    <div :class="cn('flex items-center p-6 pt-0', $attrs.class)">
      <slot />
    </div>
  `,
  setup() {
    return { cn }
  }
}
</script>