<template>
  <div class="library-view">
    <!-- 라이브러리 헤더 -->
    <div class="library-header">
      <h1 class="library-title">라이브러리</h1>
      <p class="library-description">생성한 모든 이미지와 비디오를 관리하고 프로젝트에 활용하세요</p>
    </div>

    <!-- 상단 탭 네비게이션 -->
    <div class="library-tabs">
      <button 
        v-for="tab in tabs" 
        :key="tab.id"
        :class="['tab-button', { active: activeTab === tab.id }]"
        @click="activeTab = tab.id"
      >
        <component :is="tab.icon" :size="20" />
        {{ tab.name }}
        <span class="tab-count">({{ getTabCount(tab.id) }})</span>
      </button>
    </div>

    <!-- 검색 및 필터 -->
    <LibraryControls 
      v-model:searchQuery="searchQuery"
      v-model:sortBy="sortBy"
      v-model:viewMode="viewMode"
      v-model:categoryFilter="categoryFilter"
      :show-category-filter="activeTab === 'images'"
      @clear-search="clearSearch"
    />

    <!-- 콘텐츠 영역 -->
    <div class="library-content">
      <!-- 로딩 상태 -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>라이브러리를 불러오는 중...</p>
      </div>

      <!-- 빈 상태 -->
      <div v-else-if="filteredItems.length === 0" class="empty-state">
        <component :is="getEmptyIcon()" :size="64" class="empty-icon" />
        <h3>{{ getEmptyMessage() }}</h3>
        <p>새로운 {{ activeTab === 'images' ? '이미지' : '비디오' }}를 생성해보세요!</p>
      </div>

      <!-- 아이템 그리드/리스트 -->
      <LibraryGrid 
        v-else
        :items="filteredItems"
        :view-mode="viewMode"
        :active-tab="activeTab"
        @open-detail="openItemDetail"
        @copy-item="copyToProject"
        @delete-item="deleteItem"
        @toggle-like="toggleLike"
      />
    </div>

    <!-- 아이템 상세 모달 -->
    <LibraryDetailModal 
      v-if="selectedItem"
      :item="selectedItem"
      @close="closeItemDetail"
      @copy="copyToProject"
      @download="downloadItem"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useProjectsStore } from '@/stores/projects';
import { Image, Video, Package } from 'lucide-vue-next';
import LibraryControls from '@/components/library/LibraryControls.vue';
import LibraryGrid from '@/components/library/LibraryGrid.vue';
import LibraryDetailModal from '@/components/library/LibraryDetailModal.vue';
import { supabase } from '@/utils/supabase';

const projectsStore = useProjectsStore();

// State
const activeTab = ref('images');
const searchQuery = ref('');
const sortBy = ref('created_at');
const viewMode = ref('grid');
const categoryFilter = ref('all'); // 이미지 카테고리 필터
const loading = ref(false);
const selectedItem = ref(null);
const libraryItems = ref({
  images: [],
  videos: [],
  all: []
});

// 탭 설정
const tabs = [
  { id: 'all', name: '전체', icon: Package },
  { id: 'images', name: '이미지', icon: Image },
  { id: 'videos', name: '비디오', icon: Video }
];

// Computed
const filteredItems = computed(() => {
  let items = [];
  
  if (activeTab.value === 'all') {
    items = [...libraryItems.value.images, ...libraryItems.value.videos];
  } else {
    items = libraryItems.value[activeTab.value] || [];
  }
  
  // 이미지 카테고리 필터 (이미지 탭에서만 적용)
  if (activeTab.value === 'images' && categoryFilter.value !== 'all') {
    items = items.filter(item => {
      const itemCategory = item.image_type || item.category;
      return itemCategory === categoryFilter.value;
    });
  }
  
  // 검색 필터
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    items = items.filter(item => {
      return item.prompt?.toLowerCase().includes(query) ||
             item.tags?.some(tag => tag.toLowerCase().includes(query)) ||
             item.element_name?.toLowerCase().includes(query);
    });
  }
  
  // 정렬
  items.sort((a, b) => {
    switch (sortBy.value) {
      case 'name_description':
        return (a.prompt || '').localeCompare(b.prompt || '');
      case 'usage_count':
        return (b.usage_count || 0) - (a.usage_count || 0);
      default: // created_at
        return new Date(b.created_at) - new Date(a.created_at);
    }
  });
  
  return items;
});

// Methods
const getTabCount = (tabId) => {
  if (tabId === 'all') {
    return libraryItems.value.images.length + libraryItems.value.videos.length;
  }
  return libraryItems.value[tabId]?.length || 0;
};

const clearSearch = () => {
  searchQuery.value = '';
};

const getEmptyIcon = () => {
  switch (activeTab.value) {
    case 'images':
      return Image;
    case 'videos':
      return Video;
    default:
      return Package;
  }
};

const getEmptyMessage = () => {
  if (searchQuery.value) {
    return '검색 결과가 없습니다';
  }
  switch (activeTab.value) {
    case 'images':
      return '아직 생성한 이미지가 없습니다';
    case 'videos':
      return '아직 생성한 비디오가 없습니다';
    default:
      return '아직 생성한 콘텐츠가 없습니다';
  }
};

const openItemDetail = (item) => {
  selectedItem.value = item;
};

const closeItemDetail = () => {
  selectedItem.value = null;
};

const copyToProject = async (item) => {
  // 현재 프로젝트에 아이템 복사
  console.log('Copy to project:', item);
  // TODO: 구현
};

const deleteItem = async (item) => {
  if (confirm('정말 삭제하시겠습니까?')) {
    // 아이템 삭제
    console.log('Delete item:', item);
    // TODO: 구현
  }
};

const downloadItem = async (item) => {
  if (item.type === 'image' && item.storage_image_url) {
    const response = await fetch(item.storage_image_url);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `image_${item.id}.png`;
    a.click();
    window.URL.revokeObjectURL(url);
  } else if (item.type === 'video' && item.video_url) {
    const response = await fetch(item.video_url);
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video_${item.id}.mp4`;
    a.click();
    window.URL.revokeObjectURL(url);
  }
};

const toggleLike = async (item) => {
  // 좋아요 토글 로직
  const newFavoriteStatus = !item.is_favorite;
  
  try {
    const table = item.type === 'image' ? 'gen_images' : 'gen_videos';
    const { error } = await supabase
      .from(table)
      .update({ is_favorite: newFavoriteStatus })
      .eq('id', item.id);
    
    if (!error) {
      // 로컬 상태 업데이트
      item.is_favorite = newFavoriteStatus;
    }
  } catch (error) {
    console.error('Failed to toggle like:', error);
  }
};

// 라이브러리 아이템 불러오기
const loadLibraryItems = async () => {
  loading.value = true;
  
  try {
    // 이미지 불러오기
    const { data: images, error: imagesError } = await supabase
      .from('gen_images')
      .select(`
        id,
        result_image_url,
        storage_image_url,
        thumbnail_url,
        element_name,
        image_type,
        prompt_used,
        style_name,
        generation_status,
        created_at,
        project_id
      `)
      .order('created_at', { ascending: false });
    
    if (imagesError) throw imagesError;
    
    // 비디오 불러오기
    const { data: videos, error: videosError } = await supabase
      .from('gen_videos')
      .select(`
        id,
        result_video_url,
        storage_video_url,
        thumbnail_url,
        element_name,
        video_type,
        prompt_used,
        generation_status,
        generation_model,
        created_at,
        project_id
      `)
      .order('created_at', { ascending: false });
    
    if (videosError) throw videosError;
    
    libraryItems.value.images = (images || []).map(img => ({
      ...img,
      type: 'image',
      prompt: img.prompt_used || img.custom_prompt || img.prompt || '',
      model: img.generation_model || img.model || ''
    }));
    
    libraryItems.value.videos = (videos || []).map(vid => ({
      ...vid,
      type: 'video',
      prompt: vid.prompt_used || vid.custom_prompt || vid.prompt || '',
      model: vid.generation_model || vid.model || '',
      video_url: vid.storage_video_url || vid.result_video_url || ''
    }));
    
  } catch (error) {
    console.error('Failed to load library items:', error);
  } finally {
    loading.value = false;
  }
};

// Watch for tab changes to reset category filter
watch(activeTab, (newTab) => {
  if (newTab !== 'images') {
    categoryFilter.value = 'all';
  }
});

// Lifecycle
onMounted(() => {
  loadLibraryItems();
  
  // 디버깅 로그
  console.log('LibraryView mounted');
  console.log('Window width:', window.innerWidth);
  console.log('Initial viewMode:', viewMode.value);
  
  setTimeout(() => {
    const container = document.querySelector('.items-container.grid');
    if (container) {
      const computedStyle = window.getComputedStyle(container);
      console.log('LibraryView - Computed column-count:', computedStyle.columnCount);
      console.log('LibraryView - Container found with classes:', container.className);
      
      // CSS 규칙 직접 확인
      const sheets = document.styleSheets;
      for (let sheet of sheets) {
        try {
          const rules = sheet.cssRules || sheet.rules;
          for (let rule of rules) {
            if (rule.selectorText && rule.selectorText.includes('.items-container.grid')) {
              console.log('CSS Rule found:', rule.selectorText, rule.style.columnCount);
            }
          }
        } catch (e) {
          // CORS 에러 무시
        }
      }
    } else {
      console.log('LibraryView - Grid container not found');
    }
  }, 500);
});
</script>

<style scoped>
.library-view {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 헤더 */
.library-header {
  margin-bottom: 30px;
}

.library-title {
  font-size: 2rem;
  font-weight: 700;
  color: var(--text-primary);
  margin-bottom: 8px;
}

.library-description {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* 탭 네비게이션 */
.library-tabs {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
  padding-bottom: 10px;
}

.tab-button {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  border-radius: 6px;
}

.tab-button:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.tab-button.active {
  color: var(--primary-color);
  background: rgba(74, 222, 128, 0.1);
  font-weight: 600;
}

.tab-count {
  font-size: 0.9rem;
  opacity: 0.7;
}

/* 콘텐츠 영역 */
.library-content {
  min-height: 400px;
}

/* 로딩 상태 */
.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
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

/* 빈 상태 */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
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
</style>