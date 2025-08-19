<template>
  <div class="aerial-test-view">
    <AerialViewCapture />
  </div>
</template>

<script setup>
import AerialViewCapture from '@/components/aerial/AerialViewCapture.vue'
</script>

<style scoped>
.aerial-test-view {
  width: 100%;
  height: 100vh;
  overflow: hidden;
}
</style>