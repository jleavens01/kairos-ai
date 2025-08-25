<template>
  <div class="production-view">
    <div class="view-header">
      <h1>
        <Layers :size="28" />
        콘텐츠 프로덕션
      </h1>
      <p class="view-description">AI 기반 콘텐츠 제작 파이프라인</p>
    </div>

    <div class="production-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        @click="activeTab = tab.id"
        :class="['tab-btn', { active: activeTab === tab.id }]"
      >
        <component :is="tab.icon" :size="18" />
        {{ tab.label }}
        <Badge v-if="tab.badge" :variant="tab.badgeVariant">{{ tab.badge }}</Badge>
      </button>
    </div>

    <div class="tab-content">
      <!-- AI 트렌드 분석 (통합) -->
      <NewsCollector v-if="activeTab === 'trends'" />
      
      <!-- 프로덕션 시트 -->
      <ProductionTable v-else-if="activeTab === 'sheets'" />
      
      <!-- 세모지 데이터 -->
      <SemojiDataManager v-else-if="activeTab === 'semoji'" />
      
      <!-- AI 생성 갤러리 -->
      <div v-else-if="activeTab === 'gallery'" class="gallery-container">
        <AIGenerationGallery ref="imageGalleryRef" />
      </div>
      
      <!-- 비디오 생성 -->
      <div v-else-if="activeTab === 'video'" class="video-container">
        <VideoGenerationGallery ref="videoGalleryRef" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { 
  Layers, FileText, BookOpen, 
  Image, Video, Sparkles 
} from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import NewsCollector from '@/components/production/NewsCollector.vue'
import ProductionTable from '@/components/production/ProductionTable.vue'
import SemojiDataManager from '@/components/production/SemojiDataManager.vue'
import AIGenerationGallery from '@/components/generation/AIGenerationGallery.vue'
import VideoGenerationGallery from '@/components/generation/VideoGenerationGallery.vue'

const activeTab = ref('trends')
const imageGalleryRef = ref(null)
const videoGalleryRef = ref(null)

// 탭 변경 시 스크롤 리스너 재설정
watch(activeTab, async (newTab) => {
  await nextTick()
  
  if (newTab === 'gallery' && imageGalleryRef.value) {
    setTimeout(() => {
      console.log('Tab changed to gallery, refreshing scroll listener')
      imageGalleryRef.value.refreshScrollListener()
    }, 100)
  } else if (newTab === 'video' && videoGalleryRef.value) {
    setTimeout(() => {
      console.log('Tab changed to video, refreshing scroll listener')
      videoGalleryRef.value.refreshScrollListener()
    }, 100)
  }
})

const tabs = ref([
  {
    id: 'trends',
    label: 'AI 트렌드 분석',
    icon: Sparkles,
    badge: 'AI',
    badgeVariant: 'success'
  },
  {
    id: 'sheets',
    label: '프로덕션 시트',
    icon: FileText
  },
  {
    id: 'semoji',
    label: '세모지 학습 데이터',
    icon: BookOpen,
    badge: 'AI',
    badgeVariant: 'secondary'
  },
  {
    id: 'gallery',
    label: 'AI 이미지',
    icon: Image
  },
  {
    id: 'video',
    label: 'AI 비디오',
    icon: Video
  }
])
</script>

<style scoped>
.production-view {
  padding: 24px;
  max-width: 1600px;
  margin: 0 auto;
}

.view-header {
  margin-bottom: 32px;
}

.view-header h1 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px;
  font-size: 32px;
  font-weight: 700;
  color: #212529;
}

.view-description {
  margin: 0;
  font-size: 16px;
  color: #6c757d;
}

.production-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 12px;
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}

.tab-btn:hover {
  background: white;
  color: #495057;
}

.tab-btn.active {
  background: white;
  color: #5B6CFF;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.tab-content {
  background: white;
  border-radius: 12px;
  min-height: 600px;
}

.gallery-container,
.video-container {
  padding: 24px;
}

/* 반응형 */
@media (max-width: 768px) {
  .production-view {
    padding: 16px;
  }
  
  .view-header h1 {
    font-size: 24px;
  }
  
  .production-tabs {
    padding: 6px;
    gap: 4px;
  }
  
  .tab-btn {
    padding: 8px 12px;
    font-size: 13px;
  }
}
</style>