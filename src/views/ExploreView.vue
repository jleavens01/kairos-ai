<template>
  <div class="explore-view">
    <!-- 헤더 -->
    <div class="explore-header">
      <h1 class="explore-title">Explore</h1>
      <p class="explore-description">다른 사용자들이 공유한 콘텐츠를 탐색하고 영감을 얻어보세요</p>
    </div>

    <!-- 필터 컨트롤 -->
    <div class="filter-controls">
      <!-- 카테고리 필터 -->
      <div class="category-filter">
        <button 
          v-for="category in categories"
          :key="category.id"
          :class="['category-btn', { active: selectedCategory === category.id }]"
          @click="selectedCategory = category.id"
        >
          <component :is="category.icon" :size="18" />
          {{ category.name }}
        </button>
      </div>

      <!-- 검색바 -->
      <div class="search-section">
        <Search :size="20" class="search-icon" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="프롬프트, 스타일, 태그로 검색..."
          class="search-input"
        >
        <button v-if="searchQuery" @click="searchQuery = ''" class="clear-btn">
          <X :size="16" />
        </button>
      </div>

      <!-- 정렬 및 뷰 모드 -->
      <div class="view-controls">
        <select v-model="sortBy" class="sort-select">
          <option value="trending">인기순</option>
          <option value="recent">최신순</option>
          <option value="likes">좋아요순</option>
        </select>
        
        <div class="view-mode-toggle">
          <button 
            :class="['view-btn', { active: viewMode === 'grid' }]"
            @click="viewMode = 'grid'"
          >
            <Grid :size="18" />
          </button>
          <button 
            :class="['view-btn', { active: viewMode === 'list' }]"
            @click="viewMode = 'list'"
          >
            <List :size="18" />
          </button>
        </div>
      </div>
    </div>

    <!-- 콘텐츠 그리드 -->
    <div class="content-container">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>콘텐츠를 불러오는 중...</p>
      </div>

      <div v-else-if="displayedContent.length === 0" class="empty-state">
        <Package :size="64" class="empty-icon" />
        <h3>검색 결과가 없습니다</h3>
        <p>다른 검색어나 필터를 시도해보세요</p>
      </div>

      <!-- Masonry 그리드 -->
      <div v-else-if="viewMode === 'grid'" class="masonry-grid">
        <ExploreCard 
          v-for="item in displayedContent"
          :key="item.id"
          :item="item"
          @click="openDetail(item)"
          @like="toggleLike(item)"
          @save="saveToLibrary(item)"
        />
        
        <!-- 무한 스크롤 트리거 -->
        <div 
          v-if="displayedContent.length < filteredContent.length"
          ref="loadMoreTrigger" 
          class="load-more-trigger"
        >
          <div v-if="isLoadingMore" class="loading-indicator">
            <div class="spinner"></div>
            <span>더 불러오는 중...</span>
          </div>
        </div>
      </div>

      <!-- 리스트 뷰 -->
      <div v-else class="list-view">
        <ExploreCard 
          v-for="item in displayedContent"
          :key="item.id"
          :item="item"
          @click="openDetail(item)"
          @like="toggleLike(item)"
          @save="saveToLibrary(item)"
        />
      </div>
    </div>

    <!-- 상세 모달 -->
    <ExploreDetailModal 
      v-if="selectedItem"
      :item="selectedItem"
      @close="selectedItem = null"
      @save="saveToLibrary"
      @like="toggleLike"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue';
import { Search, X, Grid, List, Package, Package2, Sparkles, Image, Video, User, Mountain } from 'lucide-vue-next';
import ExploreCard from '@/components/explore/ExploreCard.vue';
import ExploreDetailModal from '@/components/explore/ExploreDetailModal.vue';
import { supabase } from '@/utils/supabase';

// State
const selectedCategory = ref('all');
const searchQuery = ref('');
const sortBy = ref('trending');
const viewMode = ref('grid');
const loading = ref(false);
const selectedItem = ref(null);
const exploreContent = ref([]);

// 무한 스크롤 상태
const displayedContent = ref([]);
const itemsPerLoad = 20;
const loadMoreTrigger = ref(null);
const isLoadingMore = ref(false);
let observer = null;

// 카테고리 설정
const categories = [
  { id: 'all', name: '전체', icon: Sparkles },
  { id: 'images', name: '이미지', icon: Image },
  { id: 'scene', name: '씬', icon: Image },
  { id: 'character', name: '캐릭터', icon: User },
  { id: 'background', name: '배경', icon: Mountain },
  { id: 'object', name: '오브젝트', icon: Package2 },
  { id: 'videos', name: '비디오', icon: Video }
];

// Computed
const filteredContent = computed(() => {
  let content = [...exploreContent.value];
  
  // 카테고리 필터
  if (selectedCategory.value !== 'all') {
    content = content.filter(item => {
      if (selectedCategory.value === 'images') return item.type === 'image';
      if (selectedCategory.value === 'videos') return item.type === 'video';
      // 이미지 세부 카테고리
      if (['scene', 'character', 'background', 'object'].includes(selectedCategory.value)) {
        return item.type === 'image' && (item.image_type || item.category) === selectedCategory.value;
      }
      return true;
    });
  }
  
  // 검색 필터
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    content = content.filter(item => {
      return item.prompt?.toLowerCase().includes(query) ||
             item.style?.toLowerCase().includes(query) ||
             item.tags?.some(tag => tag.toLowerCase().includes(query));
    });
  }
  
  // 정렬
  content.sort((a, b) => {
    switch (sortBy.value) {
      case 'trending':
        return (b.views || 0) + (b.likes || 0) - (a.views || 0) - (a.likes || 0);
      case 'recent':
        return new Date(b.created_at) - new Date(a.created_at);
      case 'likes':
        return (b.likes || 0) - (a.likes || 0);
      default:
        return 0;
    }
  });
  
  return content;
});

// Methods
const openDetail = (item) => {
  selectedItem.value = item;
};

const toggleLike = async (item) => {
  // 좋아요 토글 로직
  console.log('Toggle like:', item);
};

const saveToLibrary = async (item) => {
  // 라이브러리에 저장 로직
  console.log('Save to library:', item);
};

// 공개 콘텐츠 불러오기
const loadExploreContent = async () => {
  loading.value = true;
  
  try {
    // 공개 이미지 불러오기 - 특정 컬럼만 로드하여 성능 최적화
    const { data: images } = await supabase
      .from('gen_images')
      .select(`
        id,
        result_image_url,
        prompt_used,
        image_type,
        element_name,
        created_at
      `)
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);
    
    // 공개 비디오 불러오기 - 특정 컬럼만 로드하여 성능 최적화
    const { data: videos } = await supabase
      .from('gen_videos')
      .select(`
        id,
        result_video_url,
        storage_video_url,
        video_url,
        thumbnail_url,
        prompt_used,
        element_name,
        created_at
      `)
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(20);
    
    // 데이터 병합 및 타입 추가
    const allContent = [
      ...(images || []).map(img => ({ 
        ...img, 
        type: 'image',
        prompt: img.prompt_used || img.custom_prompt || img.prompt || '',
        model: img.generation_model || img.model || '',
        style: img.style_name || img.style || ''
      })),
      ...(videos || []).map(vid => ({ 
        ...vid, 
        type: 'video',
        prompt: vid.prompt_used || vid.custom_prompt || vid.prompt || '',
        model: vid.generation_model || vid.model || '',
        video_url: vid.storage_video_url || vid.result_video_url || ''
      }))
    ];
    
    exploreContent.value = allContent;
  } catch (error) {
    console.error('Failed to load explore content:', error);
  } finally {
    loading.value = false;
  }
};

// 초기 아이템 로드
const loadInitialItems = () => {
  if (!filteredContent.value) return;
  displayedContent.value = filteredContent.value.slice(0, itemsPerLoad);
};

// 더 많은 아이템 로드
const loadMoreItems = () => {
  if (isLoadingMore.value || !filteredContent.value) return;
  
  const currentLength = displayedContent.value.length;
  if (currentLength >= filteredContent.value.length) return;
  
  isLoadingMore.value = true;
  
  setTimeout(() => {
    const nextItems = filteredContent.value.slice(currentLength, currentLength + itemsPerLoad);
    displayedContent.value = [...displayedContent.value, ...nextItems];
    isLoadingMore.value = false;
  }, 100);
};

// Intersection Observer 설정
const setupIntersectionObserver = () => {
  if (!loadMoreTrigger.value || viewMode.value !== 'grid') return;
  
  observer = new IntersectionObserver(
    (entries) => {
      if (entries[0].isIntersecting && !isLoadingMore.value) {
        loadMoreItems();
      }
    },
    { rootMargin: '100px' }
  );
  
  observer.observe(loadMoreTrigger.value);
};

// filteredContent 변경 감지
watch(filteredContent, (newContent) => {
  if (newContent) {
    displayedContent.value = newContent.slice(0, itemsPerLoad);
    nextTick(() => {
      if (observer) observer.disconnect();
      setupIntersectionObserver();
    });
  }
}, { immediate: true });

// viewMode 변경 감지
watch(viewMode, () => {
  nextTick(() => {
    if (observer) observer.disconnect();
    setupIntersectionObserver();
  });
});

// Lifecycle
onMounted(() => {
  loadExploreContent();
  loadInitialItems();
  nextTick(() => {
    setupIntersectionObserver();
  });
});

onUnmounted(() => {
  if (observer) {
    observer.disconnect();
  }
});
</script>

<style scoped>
.explore-view {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 헤더 */
.explore-header {
  margin-bottom: 30px;
}

.explore-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.explore-description {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* 필터 컨트롤 */
.filter-controls {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
  align-items: center;
}

.category-filter {
  display: flex;
  gap: 8px;
}

.category-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.95rem;
}

.category-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.category-btn.active {
  background: var(--primary-gradient);
  color: white;
  border-color: transparent;
}

/* 검색 섹션 */
.search-section {
  flex: 1;
  min-width: 250px;
  position: relative;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 12px;
  color: var(--text-secondary);
}

.search-input {
  width: 100%;
  padding: 10px 40px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  transition: all 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.1);
}

.clear-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

.clear-btn:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 뷰 컨트롤 */
.view-controls {
  display: flex;
  gap: 10px;
  align-items: center;
}

.sort-select {
  padding: 8px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.3s;
}

.view-mode-toggle {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.view-btn {
  padding: 6px 8px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.view-btn:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.view-btn.active {
  background: var(--bg-primary);
  color: var(--primary-color);
}

/* 콘텐츠 컨테이너 */
.content-container {
  min-height: 400px;
}

/* 로딩 & 빈 상태 */
.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top-color: var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.empty-icon {
  color: var(--text-secondary);
  margin-bottom: 20px;
}

.empty-state h3 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.empty-state p {
  color: var(--text-secondary);
}

/* 무한 스크롤 로딩 */
.load-more-trigger {
  width: 100%;
  padding: 20px;
  text-align: center;
}

.loading-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary);
}

/* Masonry 그리드 레이아웃 */
.masonry-grid {
  column-count: 2;
  column-gap: 20px;
  padding: 0;
}

@media (min-width: 768px) {
  .masonry-grid {
    column-count: 3;
  }
}

@media (min-width: 1024px) {
  .masonry-grid {
    column-count: 4;
  }
}

@media (min-width: 1440px) {
  .masonry-grid {
    column-count: 5;
  }
}

/* 리스트 뷰 */
.list-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .filter-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .category-filter {
    width: 100%;
    justify-content: space-between;
  }
  
  .search-section {
    width: 100%;
  }
  
  .view-controls {
    width: 100%;
    justify-content: space-between;
  }
}
</style>