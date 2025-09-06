<template>
  <div class="library-controls">
    <div class="search-section">
      <Search :size="20" class="search-icon" />
      <input 
        :value="searchQuery" 
        @input="$emit('update:searchQuery', $event.target.value)"
        type="text" 
        placeholder="프롬프트, 태그로 검색..."
        class="search-input"
      >
      <button 
        v-if="searchQuery" 
        @click="$emit('clear-search')" 
        class="clear-search"
      >
        <X :size="16" />
      </button>
    </div>

    <!-- 이미지 카테고리 필터 (이미지 탭에서만 표시) -->
    <div v-if="showCategoryFilter" class="category-filter-section">
      <div class="category-buttons">
        <button 
          v-for="category in imageCategories"
          :key="category.id"
          :class="['category-button', { active: categoryFilter === category.id }]"
          @click="$emit('update:categoryFilter', category.id)"
        >
          <component :is="category.icon" :size="16" />
          {{ category.name }}
        </button>
      </div>
    </div>
    
    <div class="filter-section">
      <select 
        :value="sortBy"
        @change="$emit('update:sortBy', $event.target.value)"
        class="sort-select"
      >
        <option value="created_at">최신순</option>
        <option value="name_description">이름순</option>
        <option value="usage_count">사용량순</option>
      </select>
      
      <div class="view-options">
        <button 
          :class="['view-button', { active: viewMode === 'grid' }]"
          @click="$emit('update:viewMode', 'grid')"
          title="그리드 보기"
        >
          <Grid :size="18" />
        </button>
        <button 
          :class="['view-button', { active: viewMode === 'list' }]"
          @click="$emit('update:viewMode', 'list')"
          title="리스트 보기"
        >
          <List :size="18" />
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { Search, X, Grid, List, Image, User, Mountain, Package2 } from 'lucide-vue-next';

defineProps({
  searchQuery: String,
  sortBy: String,
  viewMode: String,
  showCategoryFilter: Boolean,
  categoryFilter: String
});

defineEmits(['update:searchQuery', 'update:sortBy', 'update:viewMode', 'update:categoryFilter', 'clear-search']);

// 이미지 카테고리 정의
const imageCategories = [
  { id: 'all', name: '전체', icon: Package2 },
  { id: 'scene', name: '씬', icon: Image },
  { id: 'character', name: '캐릭터', icon: User },
  { id: 'background', name: '배경', icon: Mountain },
  { id: 'object', name: '오브젝트', icon: Package2 }
];
</script>

<style scoped>
.library-controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  margin-bottom: 20px;
  flex-wrap: wrap;
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

.clear-search {
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

.clear-search:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

/* 필터 섹션 */
.filter-section {
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

.sort-select:focus {
  outline: none;
  border-color: var(--primary-color);
}

/* 뷰 옵션 */
.view-options {
  display: flex;
  gap: 4px;
  padding: 4px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.view-button {
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

.view-button:hover {
  background: var(--bg-primary);
  color: var(--text-primary);
}

.view-button.active {
  background: var(--bg-primary);
  color: var(--primary-color);
}

/* 카테고리 필터 */
.category-filter-section {
  margin: 10px 0;
  width: 100%;
}

.category-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.category-button {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  color: var(--text-secondary);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 0.9rem;
  white-space: nowrap;
}

.category-button:hover {
  background: var(--bg-primary);
  border-color: var(--primary-color);
  color: var(--text-primary);
}

.category-button.active {
  background: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
  box-shadow: 0 2px 8px rgba(74, 222, 128, 0.3);
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .library-controls {
    flex-direction: column;
    align-items: stretch;
  }
  
  .search-section {
    width: 100%;
  }
  
  .filter-section {
    width: 100%;
    justify-content: space-between;
  }
  
  .category-buttons {
    justify-content: center;
  }
  
  .category-button {
    flex: 1;
    min-width: auto;
    justify-content: center;
    padding: 8px 12px;
    font-size: 0.85rem;
  }
}
</style>