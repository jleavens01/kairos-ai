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

    <!-- 스타일 필터 -->
    <div class="style-filter">
      <h3 class="filter-title">스타일</h3>
      <div class="style-tags">
        <button 
          v-for="style in popularStyles"
          :key="style"
          :class="['style-tag', { active: selectedStyles.includes(style) }]"
          @click="toggleStyle(style)"
        >
          {{ style }}
        </button>
      </div>
    </div>

    <!-- 콘텐츠 그리드 -->
    <div class="content-container">
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>콘텐츠를 불러오는 중...</p>
      </div>

      <div v-else-if="filteredContent.length === 0" class="empty-state">
        <Package :size="64" class="empty-icon" />
        <h3>검색 결과가 없습니다</h3>
        <p>다른 검색어나 필터를 시도해보세요</p>
      </div>

      <div v-else :class="['content-grid', viewMode]">
        <ExploreCard 
          v-for="item in filteredContent"
          :key="item.id"
          :item="item"
          :view-mode="viewMode"
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
import { ref, computed, onMounted } from 'vue';
import { Search, X, Grid, List, Package, Sparkles, Image, Video, Palette } from 'lucide-vue-next';
import ExploreCard from '@/components/explore/ExploreCard.vue';
import ExploreDetailModal from '@/components/explore/ExploreDetailModal.vue';
import { supabase } from '@/utils/supabase';

// State
const selectedCategory = ref('all');
const searchQuery = ref('');
const sortBy = ref('trending');
const viewMode = ref('grid');
const selectedStyles = ref([]);
const loading = ref(false);
const selectedItem = ref(null);
const exploreContent = ref([]);

// 카테고리 설정
const categories = [
  { id: 'all', name: '전체', icon: Sparkles },
  { id: 'images', name: '이미지', icon: Image },
  { id: 'videos', name: '비디오', icon: Video },
  { id: 'styles', name: '스타일', icon: Palette }
];

// 인기 스타일
const popularStyles = ref([
  'Realistic',
  'Anime',
  'Digital Art',
  'Watercolor',
  '3D Render',
  'Sketch',
  'Oil Painting',
  'Minimalist',
  'Abstract',
  'Cyberpunk'
]);

// Computed
const filteredContent = computed(() => {
  let content = [...exploreContent.value];
  
  // 카테고리 필터
  if (selectedCategory.value !== 'all') {
    content = content.filter(item => {
      if (selectedCategory.value === 'images') return item.type === 'image';
      if (selectedCategory.value === 'videos') return item.type === 'video';
      if (selectedCategory.value === 'styles') return item.style !== null;
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
  
  // 스타일 필터
  if (selectedStyles.value.length > 0) {
    content = content.filter(item => 
      selectedStyles.value.includes(item.style)
    );
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
const toggleStyle = (style) => {
  const index = selectedStyles.value.indexOf(style);
  if (index > -1) {
    selectedStyles.value.splice(index, 1);
  } else {
    selectedStyles.value.push(style);
  }
};

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
    // 공개 이미지 불러오기 (is_public 컬럼이 없으므로 일단 모든 이미지 가져오기)
    const { data: images } = await supabase
      .from('gen_images')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    // 공개 비디오 불러오기 (is_public 컬럼이 없으므로 일단 모든 비디오 가져오기)
    const { data: videos } = await supabase
      .from('gen_videos')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    
    // 데이터 병합 및 타입 추가
    const allContent = [
      ...(images || []).map(img => ({ ...img, type: 'image' })),
      ...(videos || []).map(vid => ({ ...vid, type: 'video' }))
    ];
    
    exploreContent.value = allContent;
  } catch (error) {
    console.error('Failed to load explore content:', error);
  } finally {
    loading.value = false;
  }
};

// Lifecycle
onMounted(() => {
  loadExploreContent();
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

/* 스타일 필터 */
.style-filter {
  margin-bottom: 25px;
}

.filter-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 10px;
}

.style-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.style-tag {
  padding: 6px 14px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 20px;
  color: var(--text-secondary);
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}

.style-tag:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.style-tag.active {
  background: rgba(74, 222, 128, 0.1);
  color: var(--primary-color);
  border-color: var(--primary-color);
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

/* 콘텐츠 그리드 */
.content-grid {
  display: grid;
  gap: 20px;
}

.content-grid.grid {
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
}

.content-grid.list {
  grid-template-columns: 1fr;
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
  
  .content-grid.grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  }
}
</style>