<template>
  <div class="media-view">
    <VideoGenerationGallery 
      ref="videoGalleryRef"
      :project-id="projectId" 
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import VideoGenerationGallery from '@/components/generation/VideoGenerationGallery.vue'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

const videoGalleryRef = ref(null)

// Expose method for parent component
defineExpose({
  openGenerationModal: () => videoGalleryRef.value?.openGenerationModal(),
  setFilterModel: (model) => videoGalleryRef.value?.setFilterModel(model),
  filterModel: () => videoGalleryRef.value?.filterModel
})
</script>

<style scoped>
.media-view {
  height: 100%;
  overflow-y: auto;
}
</style>