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
      
      <!-- 뉴스 스크립트 -->
      <NewsScriptManager v-else-if="activeTab === 'news-script'" />
      
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
        <!-- 비디오 생성 헤더 -->
        <div class="video-header">
          <div class="video-title">
            <h2>
              <Video :size="24" />
              AI 비디오 생성
            </h2>
            <p class="video-description">다양한 AI 모델로 비디오를 생성하세요</p>
          </div>
          <div class="video-actions">
            <button @click="showVideoModal = true" class="btn-generate video-btn">
              <Plus :size="18" />
              새 비디오 생성
            </button>
            <button @click="showAvatarModal = true" class="btn-generate avatar-btn">
              <User :size="18" />
              아바타 비디오 생성
            </button>
          </div>
        </div>
        
        <!-- 탭 내 서브 네비게이션 -->
        <div class="video-sub-tabs">
          <button 
            @click="videoSubTab = 'regular'"
            :class="['sub-tab-btn', { active: videoSubTab === 'regular' }]"
          >
            <Video :size="16" />
            일반 비디오
            <span v-if="regularVideoCount > 0" class="count-badge">{{ regularVideoCount }}</span>
          </button>
          <button 
            @click="videoSubTab = 'avatar'"
            :class="['sub-tab-btn', { active: videoSubTab === 'avatar' }]"
          >
            <User :size="16" />
            아바타 비디오
            <span v-if="avatarVideoCount > 0" class="count-badge">{{ avatarVideoCount }}</span>
          </button>
        </div>
        
        <!-- 일반 비디오 갤러리 -->
        <VideoGenerationGallery 
          v-if="videoSubTab === 'regular'"
          ref="videoGalleryRef" 
        />
        
        <!-- 아바타 비디오 갤러리 -->
        <AvatarVideoGallery 
          v-if="videoSubTab === 'avatar'"
          ref="avatarGalleryRef" 
        />
        
        <!-- 비디오 생성 모달 -->
        <VideoGenerationModal 
          v-if="showVideoModal"
          :show="showVideoModal"
          @close="showVideoModal = false"
        />
        
        <!-- 아바타 비디오 생성 모달 -->
        <AvatarVideoGenerationModal 
          v-if="showAvatarModal"
          @close="showAvatarModal = false"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, nextTick } from 'vue'
import { 
  Layers, FileText, BookOpen, 
  Image, Video, Sparkles, Newspaper, User, Plus 
} from 'lucide-vue-next'
import Badge from '@/components/ui/Badge.vue'
import NewsCollector from '@/components/production/NewsCollector.vue'
import NewsScriptManager from '@/components/production/NewsScriptManager.vue'
import ProductionTable from '@/components/production/ProductionTable.vue'
import SemojiDataManager from '@/components/production/SemojiDataManager.vue'
import AIGenerationGallery from '@/components/generation/AIGenerationGallery.vue'
import VideoGenerationGallery from '@/components/generation/VideoGenerationGallery.vue'
import AvatarVideoGallery from '@/components/generation/AvatarVideoGallery.vue'
import VideoGenerationModal from '@/components/generation/VideoGenerationModal.vue'
import AvatarVideoGenerationModal from '@/components/generation/AvatarVideoGenerationModal.vue'

const activeTab = ref('trends')
const imageGalleryRef = ref(null)
const videoGalleryRef = ref(null)
const avatarGalleryRef = ref(null)

// 비디오 관련 상태
const videoSubTab = ref('regular')
const showVideoModal = ref(false)
const showAvatarModal = ref(false)

// 임시 카운트 (실제로는 스토어에서 가져와야 함)
const regularVideoCount = ref(0)
const avatarVideoCount = ref(0)

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
  } else if (newTab === 'avatar' && avatarGalleryRef.value) {
    setTimeout(() => {
      console.log('Tab changed to avatar, refreshing scroll listener')
      // 필요시 아바타 갤러리의 스크롤 리스너도 추가
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
    id: 'news-script',
    label: '뉴스 스크립트',
    icon: Newspaper,
    badge: 'NEW',
    badgeVariant: 'primary'
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
    icon: Video,
    badge: 'NEW',
    badgeVariant: 'primary'
  }
])
</script>

<style scoped>
/* 비디오 헤더 스타일 */
.video-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e9ecef;
}

.video-title h2 {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #212529;
}

.video-description {
  margin: 0;
  font-size: 14px;
  color: #6c757d;
}

.video-actions {
  display: flex;
  gap: 12px;
}

.btn-generate {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  border: none;
  border-radius: 8px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.video-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.video-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(102, 126, 234, 0.3);
}

.avatar-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.avatar-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(245, 87, 108, 0.3);
}

/* 서브 탭 스타일 */
.video-sub-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  padding: 4px;
  background: #f8f9fa;
  border-radius: 8px;
  width: fit-content;
}

.sub-tab-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
  color: #6c757d;
  white-space: nowrap;
  position: relative;
}

.sub-tab-btn:hover {
  background: rgba(255, 255, 255, 0.8);
  color: #495057;
}

.sub-tab-btn.active {
  background: white;
  color: #212529;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.count-badge {
  background: #dc3545;
  color: white;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 6px;
  border-radius: 10px;
  min-width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 반응형 스타일 */
@media (max-width: 768px) {
  .video-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
  
  .video-actions {
    flex-direction: column;
  }
  
  .btn-generate {
    justify-content: center;
  }
  
  .video-sub-tabs {
    width: 100%;
    justify-content: center;
  }
  
  .sub-tab-btn {
    flex: 1;
    justify-content: center;
  }
}

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