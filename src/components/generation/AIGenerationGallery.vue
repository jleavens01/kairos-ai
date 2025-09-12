<template>
  <div class="ai-generation-gallery">
    <!-- 캐릭터 생성 제안 섹션 (가로 스크롤) -->
    <div v-if="characters.length > 0 && (!filterCategory || filterCategory === 'character')" class="suggestions-section">
      <h4 class="suggestions-title">캐릭터 생성 제안 ({{ characters.length }})</h4>
      <div class="suggestions-scroll-container">
        <div class="suggestions-list">
          <div 
            v-for="character in characters"
            :key="`suggestion-${character}`"
            class="suggestion-card-small"
            :class="{ 'has-image': characterImageMap.has(character) }"
            @click="handleCharacterClick(character)"
          >
            <!-- 생성된 캐릭터는 전체 이미지 표시 -->
            <div v-if="characterImageMap.has(character)" class="character-full-image">
              <img :src="characterImageMap.get(character)" :alt="character" />
              <div class="character-overlay desktop-visible">
                <h6>{{ character }}</h6>
                <div class="character-actions">
                  <button @click.stop="openCharacterSelector(character)" class="btn-settings" title="이미지 선택">
                    <Settings :size="14" />
                  </button>
                  <button @click.stop="openLibrarySelector(character)" class="btn-library" title="라이브러리에서 선택">
                    <FolderOpen :size="14" />
                  </button>
                  <button @click.stop="openGenerationModal(character)" class="btn-regenerate">재생성</button>
                </div>
              </div>
            </div>
            <!-- 생성되지 않은 캐릭터도 오버레이 스타일 -->
            <div v-else class="character-placeholder">
              <User :size="32" class="suggestion-icon-small" />
              <div class="character-overlay desktop-visible">
                <h6>{{ character }}</h6>
                <div class="character-actions">
                  <button @click.stop="openLibrarySelector(character)" class="btn-library" title="라이브러리에서 선택">
                    <FolderOpen :size="14" />
                  </button>
                  <button @click.stop="openGenerationModal(character)" class="btn-generate-small">생성</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <!-- 통합 갤러리 섹션 -->
    <div class="gallery-section">
      <!-- 갤러리 컨트롤 (데스크톱) -->
      <div v-if="!isMobile" class="gallery-controls">
        <!-- 카테고리 필터 버튼들 -->
        <div class="filter-buttons">
          <button 
            v-for="filter in categoryFilters" 
            :key="filter.value"
            @click="filterCategory = filter.value"
            :class="['filter-btn', { active: filterCategory === filter.value }]"
          >
            {{ filter.label }}
          </button>
        </div>
        <!-- 컬럼 컨트롤 -->
        <div v-if="galleryImages.length > 0" class="column-control-wrapper">
          <ColumnControl 
            v-model="columnCount"
            :min-columns="2"
            :max-columns="8"
            @change="updateColumnCount"
          />
        </div>
      </div>
      <!-- 모바일 카테고리 드롭다운 (기존 유지) -->
      <div v-if="isMobile && galleryImages.length > 0" class="mobile-filter">
        <select v-model="filterCategory" class="filter-select">
          <option value="">전체</option>
          <option value="scene">씬</option>
          <option value="character">캐릭터</option>
          <option value="background">배경</option>
          <option value="object">오브젝트</option>
          <option value="reference">자료</option>
        </select>
      </div>
      <div v-if="loading && images.length === 0" class="loading-state">
        <div class="spinner"></div>
        <p>이미지를 불러오는 중...</p>
      </div>
      <div v-if="galleryImages.length === 0 && processingImages.length === 0" class="empty-state">
        <Image :size="48" class="empty-icon" />
        <p>아직 생성된 이미지가 없습니다.</p>
        <p class="hint">새 이미지 생성 버튼을 눌러 시작하세요.</p>
      </div>
      <div v-else class="image-grid" :style="{ columnCount: columnCount }">
        <!-- 이미지들 -->
        <div 
          v-for="item in galleryImages" 
          :key="item.id"
          class="gallery-item"
          :class="{ 
            'image-card': item.type === 'image',
            'processing-card': item.type === 'processing',
            'selected': item.type === 'image' && selectedImage?.id === item.id 
          }"
          @click="item.type === 'image' ? handleImageClick(item) : null"
        >
          <!-- 처리 중인 이미지 카드 -->
          <template v-if="item.type === 'processing'">
            <div class="image-wrapper processing-wrapper">
              <div class="processing-animation">
                <div class="spinner"></div>
                <p class="processing-text">{{ item.generation_status === 'pending' ? '대기 중...' : '생성 중...' }}</p>
                <p class="processing-model">{{ item.generation_model }}</p>
              </div>
            </div>
          </template>
          <!-- 생성된 이미지 카드 -->
          <template v-else>
            <div class="image-wrapper" :class="{ 'failed-wrapper': item.generation_status === 'failed' }">
              <!-- 실패한 이미지 표시 -->
              <div v-if="item.generation_status === 'failed'" class="failed-image">
                <div class="failed-icon">❌</div>
                <p class="failed-text">생성 실패</p>
                <p class="failed-model">{{ item.generation_model }}</p>
                <p v-if="item.error_message" class="failed-reason">{{ item.error_message }}</p>
              </div>
              <!-- 성공한 이미지 표시 -->
              <LazyImage 
                v-else
                :src="getOptimizedImageUrl(item)" 
                :alt="item.prompt_used || 'AI Generated Image'"
                :fallback-src="item.result_image_url"
                root-margin="100px"
              />
              <div class="image-overlay-info">
                <div class="info-top">
                  <button 
                    @click.stop="toggleFavorite(item)"
                    class="btn-favorite"
                    :class="{ active: item.is_favorite }"
                  >
                    <Star v-if="item.is_favorite" :size="16" fill="currentColor" />
                    <Star v-else :size="16" />
                  </button>
                  <button 
                    @click.stop="toggleKeep(item)"
                    class="btn-keep"
                    :class="{ active: item.is_kept }"
                    :title="item.is_kept ? '보관함에서 제거' : '보관함에 추가'"
                  >
                    <Archive v-if="item.is_kept" :size="16" fill="currentColor" />
                    <Archive v-else :size="16" />
                  </button>
                  <button 
                    @click.stop="connectToScene(item)"
                    class="btn-connect"
                    :class="{ connected: item.production_sheet_id }"
                    title="스토리보드에 연결"
                  >
                    <Link :size="16" />
                  </button>
                  <button 
                    v-if="canEdit"
                    @click.stop="openTagEditor(item)"
                    class="btn-tags"
                    title="태그 편집"
                  >
                    <Tag :size="16" />
                  </button>
                  <button 
                    @click.stop="downloadImage(item)"
                    class="btn-download"
                    title="다운로드"
                  >
                    <Download :size="16" />
                  </button>
                  <button 
                    v-if="canEdit"
                    @click.stop="deleteImage(item)"
                    class="btn-delete"
                    title="삭제"
                  >
                    <Trash2 :size="16" />
                  </button>
                </div>
                <div class="info-bottom">
                  <div class="model-size-row">
                    <p class="image-model">{{ item.generation_model || 'Unknown' }}</p>
                    <p v-if="item.file_size" class="image-size" :class="getFileSizeColorClass(item.file_size)">
                      {{ formatFileSize(item.file_size) }}
                    </p>
                  </div>
                  <p v-if="item.element_name" class="image-character">
                    {{ item.element_name }}
                  </p>
                  <div v-if="item.tags && item.tags.length > 0" class="image-tags">
                    <span 
                      v-for="(tag, index) in item.tags.slice(0, 5)" 
                      :key="index"
                      class="tag-chip"
                    >
                      {{ tag }}
                    </span>
                    <span v-if="item.tags.length > 5" class="tag-more">
                      +{{ item.tags.length - 5 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </template>
        </div>
      </div>
      <!-- 페이지네이션 컨트롤 -->
      <div v-if="totalPages > 1" class="pagination-controls">
        <button 
          @click="changePage(1)"
          :disabled="currentPage === 1"
          class="page-btn"
          title="처음 페이지"
        >
          «
        </button>
        <button 
          @click="changePage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="page-btn"
          title="이전 페이지"
        >
          ‹
        </button>
        <div class="page-numbers">
          <button
            v-for="page in visiblePages"
            :key="page"
            @click="changePage(page)"
            :class="['page-btn', { active: page === currentPage }]"
          >
            {{ page }}
          </button>
        </div>
        <button 
          @click="changePage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="page-btn"
          title="다음 페이지"
        >
          ›
        </button>
        <button 
          @click="changePage(totalPages)"
          :disabled="currentPage === totalPages"
          class="page-btn"
          title="마지막 페이지"
        >
          »
        </button>
        <div class="page-info">
          {{ currentPage }} / {{ totalPages }} 페이지 (총 {{ totalCount }}개)
        </div>
      </div>
    </div>
    <!-- 이미지 생성 모달 -->
    <ImageGenerationModal
      v-if="showGenerationModal"
      :show="showGenerationModal"
      :project-id="projectId"
      :initial-prompt="currentPrompt"
      :character-name="currentCharacter"
      :initial-model="editImageData?.model"
      :initial-size="editImageData?.size"
      :initial-category="editImageData?.category"
      :initial-name="editImageData?.name"
      :reference-image="editImageData?.referenceImage"
      @close="closeGenerationModal"
      @success="handleGenerationSuccess"
    />
    <!-- 씬 연결 모달 -->
    <SceneConnectionModal
      v-if="showSceneModal"
      :show="showSceneModal"
      :media="imageToConnect"
      :media-type="'image'"
      :project-id="projectId"
      @close="showSceneModal = false"
      @success="handleSceneConnection"
    />
    <!-- 태그 편집 모달 -->
    <TagEditModal
      v-if="showTagModal"
      :show="showTagModal"
      :image="imageToEdit"
      @close="showTagModal = false"
      @success="handleTagUpdate"
    />
    <!-- 이미지 상세보기 모달 -->
    <ImageDetailModal
      v-if="showDetailModal"
      :show="showDetailModal"
      :image="imageToView"
      @close="showDetailModal = false"
      @update="handleImageUpdate"
      @edit-tags="openTagEditorFromDetail"
      @connect-scene="connectToSceneFromDetail"
      @edit-image="handleEditImage"
      @generate-video="handleGenerateVideo"
      @vectorize="handleVectorize"
      @upscale="handleUpscale"
      @remove-background="handleRemoveBackground"
    />
    <!-- 비디오 생성 모달 -->
    <VideoGenerationModal
      v-if="showVideoModal"
      :show="showVideoModal"
      :project-id="projectId"
      :initial-prompt="videoPrompt"
      :initial-image="videoReferenceImage"
      @close="closeVideoModal"
      @generated="handleVideoGenerated"
    />
    <!-- 캐릭터 이미지 선택 모달 -->
    <CharacterImageSelector
      :is-open="showCharacterSelector"
      :character-name="selectedCharacterName"
      :project-id="projectId"
      :current-image-url="characterImageMap.get(selectedCharacterName)"
      @close="showCharacterSelector = false"
      @select="handleCharacterImageSelect"
    />
    <!-- 라이브러리 선택 모달 -->
    <LibraryImageSelector
      :is-open="showLibrarySelector"
      :character-name="selectedCharacterName"
      :project-id="projectId"
      @close="showLibrarySelector = false"
      @select="handleLibraryImageSelect"
    />
    
    <!-- Recraft 편집 모달들 -->
    <VectorizeModal
      :show="showVectorizeModal"
      :original-image="vectorizeImageData?.imageUrl"
      :image-id="vectorizeImageData?.imageId"
      @close="showVectorizeModal = false"
      @success="handleVectorizeSuccess"
    />
    
    <UpscaleModal
      :show="showUpscaleModal"
      :original-image="upscaleImageData?.imageUrl"
      :image-id="upscaleImageData?.imageId"
      @close="showUpscaleModal = false"
      @success="handleUpscaleSuccess"
    />
    
    <RemoveBackgroundModal
      :show="showRemoveBackgroundModal"
      :original-image="removeBackgroundImageData?.imageUrl"
      :image-id="removeBackgroundImageData?.imageId"
      @close="showRemoveBackgroundModal = false"
      @success="handleRemoveBackgroundSuccess"
    />
  </div>
</template>
<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { supabase } from '@/utils/supabase'
import { useProductionStore } from '@/stores/production'
import { useProjectsStore } from '@/stores/projects'
import ImageGenerationModal from './ImageGenerationModal.vue'
import VideoGenerationModal from './VideoGenerationModal.vue'
import SceneConnectionModal from './SceneConnectionModal.vue'
import CharacterImageSelector from './CharacterImageSelector.vue'
import LibraryImageSelector from './LibraryImageSelector.vue'
import { Link, Tag, Download, Trash2, Loader, Plus, User, Image, Star, Archive, FolderOpen, Settings } from 'lucide-vue-next'
import TagEditModal from './TagEditModal.vue'
import ImageDetailModal from './ImageDetailModal.vue'
import VectorizeModal from './VectorizeModal.vue'
import UpscaleModal from './UpscaleModal.vue'
import RemoveBackgroundModal from './RemoveBackgroundModal.vue'
import ColumnControl from '@/components/common/ColumnControl.vue'
import LazyImage from '@/components/common/LazyImage.vue'
import { formatFileSize, getFileSizeColorClass } from '@/utils/fileSize'
import { usePagination } from '@/composables/usePagination'
const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  canEdit: {
    type: Boolean,
    default: true
  }
})
const productionStore = useProductionStore()
const projectsStore = useProjectsStore()
// State
const images = ref([])
const characterImagesForSuggestions = ref([]) // 상단 제안 섹션용 캐릭터 이미지
const selectedImage = ref(null)
const filterCategory = ref('')
// 카테고리 필터 옵션
const categoryFilters = [
  { value: '', label: '전체' },
  { value: 'scene', label: '씬' },
  { value: 'character', label: '캐릭터' },
  { value: 'background', label: '배경' },
  { value: 'object', label: '오브젝트' },
  { value: 'reference', label: '자료' }
]
const showKeptOnly = ref(false) // 보관함 보기 상태
// 페이지네이션 상태
const currentPage = ref(1)
const pageSize = ref(20) // 페이지당 20개로 변경
const totalCount = ref(0)
const totalPages = computed(() => Math.ceil(totalCount.value / pageSize.value))
const showGenerationModal = ref(false)
const showCharacterSelector = ref(false)
const showLibrarySelector = ref(false)
const selectedCharacterName = ref('')
const customCharacterImageMap = ref(new Map())
const showSceneModal = ref(false)
const showTagModal = ref(false)
const showDetailModal = ref(false)
const showVideoModal = ref(false) // 비디오 생성 모달 상태

// Recraft 편집 모달 상태들
const showVectorizeModal = ref(false)
const showUpscaleModal = ref(false)
const showRemoveBackgroundModal = ref(false)
const vectorizeImageData = ref(null)
const upscaleImageData = ref(null)
const removeBackgroundImageData = ref(null)

const currentPrompt = ref('')
const currentCharacter = ref('')
const imageToConnect = ref(null)
const imageToEdit = ref(null)
const imageToView = ref(null)
const editImageData = ref(null) // 이미지 수정을 위한 데이터
const videoPrompt = ref('') // 비디오 생성용 프롬프트
const videoReferenceImage = ref(null) // 비디오 생성용 참조 이미지
// const realtimeChannel = ref(null) - Realtime 제거
// 모달 상태를 store와 동기화
watch(showGenerationModal, (isOpen) => {
  productionStore.setModalOpen(isOpen)
})
watch(showDetailModal, (isOpen) => {
  productionStore.setModalOpen(isOpen)
})
watch(showSceneModal, (isOpen) => {
  productionStore.setModalOpen(isOpen)
})
watch(showTagModal, (isOpen) => {
  productionStore.setModalOpen(isOpen)
})
watch(showVideoModal, (isOpen) => {
  productionStore.setModalOpen(isOpen)
})
// 모바일 여부 감지
const isMobile = ref(window.innerWidth <= 768)
const handleResize = () => {
  isMobile.value = window.innerWidth <= 768
  // 모바일에서는 컬럼 수를 2로 고정
  if (isMobile.value) {
    columnCount.value = 2
  }
}
// 컬럼 수 상태 (localStorage에 저장)
const savedColumns = localStorage.getItem('aiGenerationGalleryColumns')
const columnCount = ref(isMobile.value ? 2 : (savedColumns ? parseInt(savedColumns) : 4))
const updateColumnCount = (count) => {
  if (!isMobile.value) {
    columnCount.value = count
    localStorage.setItem('aiGenerationGalleryColumns', count.toString())
  }
}
// 무한 스크롤 핸들러
const handleScroll = (event) => {
  let scrollElement = event?.target || document.documentElement
  // 데스크톱에서는 ai-generation-gallery 자체가 스크롤 컨테이너
  if (!isMobile.value) {
    // 이벤트 타겟이 있으면 그것을 사용
    if (event?.target) {
      scrollElement = event.target
    } else {
      // 없으면 ai-generation-gallery를 찾음
      const gallery = document.querySelector('.ai-generation-gallery')
      if (gallery) {
        scrollElement = gallery
      }
    }
  }
  const scrollBottom = scrollElement.scrollHeight - scrollElement.scrollTop - scrollElement.clientHeight
  // Scroll check removed
  // 하단에서 200px 이내에 도달하면 다음 페이지 로드
  if (scrollBottom < 200 && hasMore.value && !loading.value) {
    // Triggering loadMore
    loadMore()
  }
}
// 스크롤 이벤트 리스너 설정
const setupScrollListener = () => {
  // 기존 리스너 제거
  window.removeEventListener('scroll', handleScroll)
  document.removeEventListener('scroll', handleScroll)
  // 기존 갤러리 리스너 제거
  const oldGallery = document.querySelector('.ai-generation-gallery')
  if (oldGallery) {
    oldGallery.removeEventListener('scroll', handleScroll)
  }
  // Vue.nextTick을 사용하여 DOM 업데이트 후 실행
  nextTick(() => {
    // 데스크톱에서는 ai-generation-gallery에 리스너 추가
    if (!isMobile.value) {
      const gallery = document.querySelector('.ai-generation-gallery')
      if (gallery) {
        // Desktop: Setting up scroll listener
        gallery.addEventListener('scroll', handleScroll, { passive: true })
        // 초기 스크롤 체크
        setTimeout(() => {
          // Initial scroll check for desktop
          handleScroll({ target: gallery })
        }, 100)
        return
      } else {
        // Desktop: .ai-generation-gallery not found
      }
    }
    // 모바일에서는 window에 리스너 추가
    // Mobile: Setting up scroll listener on window
    window.addEventListener('scroll', handleScroll, { passive: true })
    // 초기 스크롤 체크
    setTimeout(() => {
      // Initial scroll check for mobile
      handleScroll()
    }, 100)
  })
}
// Computed
// 페이지네이션에서 보여줄 페이지 번호들
const visiblePages = computed(() => {
  const pages = []
  const maxVisible = 5 // 최대 5개 페이지 번호 표시
  let start = Math.max(1, currentPage.value - Math.floor(maxVisible / 2))
  let end = Math.min(totalPages.value, start + maxVisible - 1)
  // 끝에서 시작 조정
  if (end - start < maxVisible - 1) {
    start = Math.max(1, end - maxVisible + 1)
  }
  for (let i = start; i <= end; i++) {
    pages.push(i)
  }
  return pages
})
// 스토리보드에서 추출한 유니크한 캐릭터 목록
const characters = computed(() => {
  const allCharacters = new Set()
  productionStore.productionSheets.forEach(sheet => {
    if (sheet.characters && Array.isArray(sheet.characters)) {
      sheet.characters.forEach(char => allCharacters.add(char))
    }
  })
  // 이미 생성된 캐릭터 이미지가 있는지 확인
  const generatedCharacters = new Set(
    images.value
      .filter(img => img.image_type === 'character' && img.element_name && img.generation_status === 'completed')
      .map(img => img.element_name)
  )
  // 모든 캐릭터 반환 (생성된 것과 생성되지 않은 것 모두)
  return Array.from(allCharacters)
})
// 캐릭터별 최신 이미지 맵 (상단 제안 섹션용)
const characterImageMap = computed(() => {
  const map = new Map()
  // characterImagesForSuggestions에서 캐릭터 이미지 매핑
  const completedCharacters = characterImagesForSuggestions.value
    .filter(img => img.element_name && img.generation_status === 'completed')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  // Debug log removed
  if (completedCharacters.length > 0) {
    // Debug log removed
  }
  completedCharacters.forEach(img => {
    // 사용자가 선택한 이미지가 있으면 그것을 사용, 없으면 최신 이미지 사용
    if (customCharacterImageMap.value.has(img.element_name)) {
      map.set(img.element_name, customCharacterImageMap.value.get(img.element_name))
      // Debug log removed
    } else if (!map.has(img.element_name)) {
      const imageUrl = img.thumbnail_url || img.result_image_url
      map.set(img.element_name, imageUrl)
      // Debug log removed
    }
  })
  // customCharacterImageMap에만 있는 항목도 추가
  customCharacterImageMap.value.forEach((imageUrl, characterName) => {
    if (!map.has(characterName)) {
      map.set(characterName, imageUrl)
    }
  })
  // Debug log removed
  return map
})
// 캐릭터별 전체 이미지 객체 맵 (상단 제안 섹션용)
const characterObjectMap = computed(() => {
  const map = new Map()
  // characterImagesForSuggestions에서 캐릭터 이미지 매핑
  const completedCharacters = characterImagesForSuggestions.value
    .filter(img => img.element_name && img.generation_status === 'completed')
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  completedCharacters.forEach(img => {
    if (!map.has(img.element_name)) {
      map.set(img.element_name, img)
    }
  })
  return map
})
// 캐릭터 생성 제안 목록
const characterSuggestions = computed(() => {
  // 캐릭터 필터가 적용되어 있지 않으면 제안 카드를 표시하지 않음
  if (filterCategory.value && filterCategory.value !== 'character') {
    return []
  }
  // 보관함일 때는 제안 카드를 표시하지 않음
  if (showKeptOnly.value) {
    return []
  }
  const suggestions = []
  // 스토리보드의 모든 캐릭터를 순회
  characters.value.forEach(characterName => {
    // 이미 생성된 캐릭터인지 확인
    const existingImage = characterObjectMap.value.get(characterName)
    // 아직 생성되지 않은 캐릭터만 제안 카드로 표시
    if (!existingImage) {
      suggestions.push({
        name: characterName,
        existingImage: null
      })
    }
  })
  // Debug log removed
  return suggestions
})
// 필터링된 이미지 목록 (모든 이미지 포함)
const filteredImages = computed(() => {
  
  // completed 또는 failed 상태의 모든 이미지 표시 (캐릭터 포함)
  let filtered = images.value.filter(img => {
    const isVisibleStatus = img.generation_status === 'completed' || img.generation_status === 'failed'
    return isVisibleStatus
  })
  
  // 보관함 필터
  if (showKeptOnly.value) {
    filtered = filtered.filter(img => img.is_kept === true)
  } else {
    filtered = filtered.filter(img => !img.is_kept) // 보관함이 아닐 때는 보관되지 않은 것만
  }
  
  if (filterCategory.value) {
    filtered = filtered.filter(img => img.image_type === filterCategory.value)
  }
  
  // 최종 필터링 결과 반환
  return {
    samples: filtered.slice(0, 3).map(img => ({
      id: img.id,
      status: img.generation_status,
      hasThumb: !!img.thumbnail_url,
      hasResult: !!img.result_image_url
    }))
  })
  
  return filtered
})
// 이미지 갤러리용 아이템 (제안 카드 제외)
const galleryImages = computed(() => {
  const items = []
  // 처리 중인 이미지 추가
  processingImages.value.forEach(image => {
    items.push({
      ...image,
      type: 'processing'
    })
  })
  // 생성된 이미지 추가
  filteredImages.value.forEach(image => {
    items.push({
      ...image,
      type: 'image'
    })
  })
  return items
})
// 생성 제안 카드와 생성된 이미지를 통합한 갤러리 아이템 (하위 호환성 유지)
const combinedGalleryItems = computed(() => {
  const items = []
  // 처리 중인 이미지 추가
  processingImages.value.forEach(image => {
    items.push({
      ...image,
      type: 'processing'
    })
  })
  // 캐릭터 필터가 없거나 캐릭터 필터일 때만 제안 카드 표시
  if (!filterCategory.value || filterCategory.value === 'character') {
    // 아직 생성되지 않은 캐릭터들의 제안 카드 추가
    characters.value.forEach(character => {
      items.push({
        type: 'suggestion',
        character: character,
        id: `suggestion-${character}`
      })
    })
  }
  // 생성된 이미지 추가
  filteredImages.value.forEach(image => {
    items.push({
      ...image,
      type: 'image'
    })
  })
  return items
})
// 처리 중인 이미지 목록
const processingImages = computed(() => {
  return images.value.filter(
    img => img.generation_status === 'pending' || img.generation_status === 'processing'
  )
})
// Methods
// 페이지네이션을 위한 함수 (모든 이미지 포함)
const fetchImagesWithPagination = async ({ page, pageSize: size }) => {
  const from = (page - 1) * size
  const to = from + size - 1
  try {
    // 필요한 컬럼만 선택하여 성능 최적화
    const selectColumns = `
      id, project_id, user_id, element_name, image_type, generation_model,
      result_image_url, thumbnail_url, generation_status,
      style_name, style_id, is_kept, is_favorite, tags, production_sheet_id,
      scene_number, created_at, updated_at
    `
    
    let query = supabase
      .from('gen_images')
      .select(selectColumns, { count: 'exact' })
      .eq('project_id', props.projectId)
      .in('generation_status', ['completed', 'failed']) // 완료된 것만
    
    // 보관함 필터를 DB 쿼리에서 처리
    if (showKeptOnly.value) {
      query = query.eq('is_kept', true)
    } else {
      query = query.or('is_kept.is.null,is_kept.eq.false') // 보관되지 않은 것만
    }
    
    const { data, error, count } = await query
      .order('created_at', { ascending: false })
      .range(from, to)
    if (error) {
      console.error('이미지 조회 쿼리 오류:', error)
      throw error
    }
    
    console.log('이미지 조회 결과:', {
      count: data?.length || 0,
      totalCount: count,
      sampleData: data?.slice(0, 2)
    })
    
    return {
      data: data || [],
      count: count || 0,
      hasMore: (to + 1) < count
    }
  } catch (error) {
    console.error('Error fetching images:', error)
    return { data: [], count: 0, hasMore: false }
  }
}
// 페이지네이션 composable 사용
const {
  items: paginatedImages,
  loading,
  hasMore,
  loadMore,
  refresh: refreshImages
} = usePagination(fetchImagesWithPagination, { pageSize: pageSize.value })
// paginatedImages를 images와 동기화
watch(paginatedImages, (newImages) => {
  images.value = newImages
}, { deep: true })
// 캐릭터 이미지만 별도로 로드 (상단 제안 섹션용)
const fetchCharacterImages = async () => {
  try {
    // 캐릭터 이미지만 효율적으로 가져오기 (필요한 컬럼만)
    const selectColumns = `
      id, element_name, image_type, result_image_url,
      thumbnail_url, generation_status, style_name, is_kept, created_at
    `
    
    const { data, error } = await supabase
      .from('gen_images')
      .select(selectColumns)
      .eq('project_id', props.projectId)
      .eq('image_type', 'character')
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
    if (error) throw error
    // 캐릭터 이미지만 별도로 저장
    characterImagesForSuggestions.value = data || []
    // Debug log removed
  } catch (error) {
    console.error('Error fetching character images:', error)
    characterImagesForSuggestions.value = []
  }
}
// 페이지별 이미지 로드 (갤러리용 - AI 생성 이미지 + 저장된 자료 이미지)
const fetchImages = async () => {
  loading.value = true
  try {
    console.log('🔍 이미지 로딩 시작')
    
    // 성능 개선: 쿼리 단순화 및 제한 추가
    let query = supabase
      .from('gen_images')
      .select(`
        id,
        result_image_url,
        thumbnail_url,
        element_name,
        image_type,
        prompt_used,
        style_name,
        generation_status,
        is_kept,
        is_shared,
        created_at
      `)
      .eq('project_id', props.projectId)
      .in('generation_status', ['completed', 'failed'])
      .order('created_at', { ascending: false })
      .limit(50) // 타임아웃 방지를 위해 제한
    
    // 카테고리 필터 적용
    if (filterCategory.value) {
      query = query.eq('image_type', filterCategory.value)
    }
    
    // 보관함 필터 (단순화)
    if (showKeptOnly.value) {
      query = query.eq('is_kept', true)
    }
    
    const { data: genImages, error: genError } = await query
    
    if (genError) throw genError
    
    
    // 필터링 로직 단순화
    let filteredImages = genImages || []
    
    // 클라이언트 사이드 필터링으로 변경 (성능 개선)
    if (!showKeptOnly.value) {
      filteredImages = filteredImages.filter(img => !img.is_kept)
    }
    
    
    // 페이지네이션
    const from = (currentPage.value - 1) * pageSize.value
    const paginatedImages = filteredImages.slice(from, from + pageSize.value)
    
    images.value = paginatedImages
    totalCount.value = filteredImages.length
    
    // 프로덕션 시트에서 캐릭터 확인
    const allCharacters = new Set()
    productionStore.productionSheets.forEach(sheet => {
      if (sheet.characters && Array.isArray(sheet.characters)) {
        sheet.characters.forEach(char => allCharacters.add(char))
      }
    })
    
  } catch (error) {
    console.error('Error fetching images:', error)
    images.value = []
    totalCount.value = 0
  } finally {
    loading.value = false
  }
}
// 페이지 변경 핸들러
const changePage = (page) => {
  currentPage.value = page
  fetchImages()
  // 스크롤을 맨 위로
  const gallery = document.querySelector('.ai-generation-gallery')
  if (gallery) {
    gallery.scrollTop = 0
  } else {
    window.scrollTo(0, 0)
  }
}
const handleCharacterClick = (character) => {
  // 생성된 캐릭터는 상세보기, 생성되지 않은 캐릭터는 생성 모달
  if (characterObjectMap.value.has(character)) {
    const characterImage = characterObjectMap.value.get(character)
    openDetailModal(characterImage)
  } else {
    openGenerationModal(character)
  }
}
// 캐릭터 이미지 선택 모달 열기
const openCharacterSelector = (character) => {
  selectedCharacterName.value = character
  showCharacterSelector.value = true
}
// 라이브러리 선택 모달 열기
const openLibrarySelector = (character) => {
  selectedCharacterName.value = character
  showLibrarySelector.value = true
}
// 캐릭터 이미지 선택 처리
const handleCharacterImageSelect = ({ characterName, imageUrl }) => {
  // 선택한 이미지를 customCharacterImageMap에 저장
  customCharacterImageMap.value.set(characterName, imageUrl)
  // localStorage에도 저장하여 새로고침 후에도 유지
  const savedSelections = JSON.parse(localStorage.getItem('characterImageSelections') || '{}')
  savedSelections[`${props.projectId}-${characterName}`] = imageUrl
  localStorage.setItem('characterImageSelections', JSON.stringify(savedSelections))
  // Debug log removed
}
// 라이브러리 이미지 선택 처리
const handleLibraryImageSelect = async ({ characterName, imageUrl, imageData }) => {
  // 선택한 이미지를 customCharacterImageMap에 저장
  customCharacterImageMap.value.set(characterName, imageUrl)
  // localStorage에도 저장
  const savedSelections = JSON.parse(localStorage.getItem('characterImageSelections') || '{}')
  savedSelections[`${props.projectId}-${characterName}`] = imageUrl
  localStorage.setItem('characterImageSelections', JSON.stringify(savedSelections))
  // Debug log removed
  // 이미지 목록 새로고침 (새로 추가된 is_shared 이미지 포함)
  await fetchImages()
}
const openGenerationModal = (character = '') => {
  currentCharacter.value = character
  if (character) {
    currentPrompt.value = `Character portrait of ${character}`
  } else {
    currentPrompt.value = ''
  }
  showGenerationModal.value = true
}
const openGenerationModalForCharacter = (characterName) => {
  currentCharacter.value = characterName
  currentPrompt.value = `${characterName} 캐릭터`
  selectedCategory.value = 'character'
  selectedElement.value = characterName
  showGenerationModal.value = true
}
const closeGenerationModal = () => {
  showGenerationModal.value = false
  currentPrompt.value = ''
  currentCharacter.value = ''
  editImageData.value = null // 수정 데이터 초기화
}
const handleGenerationSuccess = async (result) => {
  closeGenerationModal()
  // 캐릭터 이미지인 경우 캐릭터 이미지 먼저 새로고침
  if (result.image_type === 'character' || result.category === 'character') {
    await fetchCharacterImages()
  }
  // 이미지 목록 새로고침
  await fetchImages()
  // 백그라운드 처리를 위한 폴링 시작
  if (result.id && (result.status === 'processing' || result.status === 'pending')) {
    // 전체 폴링 워커 시작 (개별 이미지 대신)
    startPollingWorker()
  }
}
// 폴링 워커 인터벌 ID 저장
let pollingWorkerInterval = null
// 폴링 워커 시작
const startPollingWorker = () => {
  // Debug log removed
  // 기존 폴링 중지
  if (pollingWorkerInterval) {
    clearInterval(pollingWorkerInterval)
  }
  // 폴링 시작 시간 기록
  const startTime = Date.now()
  let pollCount = 0
  const maxPolls = 40 // 최대 40회 (5초 * 40 = 200초)
  let forceCheckDone = false // 5분 후 강제 체크 여부
  
  // 즉시 한 번 실행
  callPollingWorker()
  pollCount++
  
  // 5초마다 폴링 워커 호출
  pollingWorkerInterval = setInterval(async () => {
    const elapsedTime = Date.now() - startTime
    
    // 5분(300초) 경과 시 강제로 상태 체크 1회 실행
    if (!forceCheckDone && elapsedTime > 300000) {
      console.log('🔍 5분 경과 - 강제 상태 체크 실행')
      forceCheckDone = true
      await callPollingWorker()
      
      // 여전히 processing 상태인 이미지들을 failed로 변경
      const stuckImages = processingImages.value.filter(img => {
        const imgStartTime = new Date(img.created_at).getTime()
        return Date.now() - imgStartTime > 300000 // 5분 이상 경과
      })
      
      if (stuckImages.length > 0) {
        console.warn(`⚠️ 5분 초과 이미지 ${stuckImages.length}개를 실패 처리합니다`)
        stuckImages.forEach(img => {
          console.warn(`- ${img.prompt} (ID: ${img.id})`)
        })
        await markImagesAsFailed(stuckImages.map(img => img.id), '생성 시간 초과 (5분)')
        await loadImages() // 갤러리 새로고침
      }
    }
    
    // 최대 폴링 횟수 또는 시간 초과 체크 (기존 200초 + 5분 강제체크까지)
    if (pollCount >= maxPolls || elapsedTime > 400000) {
      console.log('⏰ 폴링 시간 제한 도달')
      stopPollingWorker()
      return
    }
    
    // 처리 중인 이미지가 없으면 중지
    if (processingImages.value.length === 0) {
      stopPollingWorker()
      return
    }
    
    await callPollingWorker()
    pollCount++
  }, 5000)
}
// 폴링 워커 중지
const stopPollingWorker = () => {
  // Debug log removed
  if (pollingWorkerInterval) {
    clearInterval(pollingWorkerInterval)
    pollingWorkerInterval = null
  }
}

// 이미지들을 실패 상태로 표시
const markImagesAsFailed = async (imageIds, errorMessage = '생성 실패') => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from('gen_images')
      .update({
        generation_status: 'failed',
        error_message: errorMessage,
        completed_at: new Date().toISOString()
      })
      .in('id', imageIds)
      .eq('created_by', session.user.id)

    if (error) {
      console.error('Failed to mark images as failed:', error)
    } else {
      // 이미지 실패 처리 완료
    }
  } catch (error) {
    console.error('Error marking images as failed:', error)
  }
}

// 폴링 워커 호출
const callPollingWorker = async () => {
  // 개발 환경에서만 폴링 실행
  if (import.meta.env.MODE !== 'development') {
    // Debug log removed
    return
  }
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      stopPollingWorker()
      return
    }
    // Debug log removed
    // AbortController로 타임아웃 설정 (3초)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 3000)
    // imagePollingWorker가 404일 경우 processImageQueue 사용 (서버 재시작 필요)
    const response = await fetch('/.netlify/functions/processImageQueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({}),
      signal: controller.signal
    })
    clearTimeout(timeoutId)
    if (!response.ok) {
      console.error('Polling worker failed:', response.status)
      return
    }
    const result = await response.json()
    // Debug log removed
    // 항상 갤러리를 새로고침하여 상태 업데이트
    await fetchImages() // 갤러리 데이터 새로고침
    // 더 이상 처리 중인 이미지가 없으면 폴링 중지
    if (result.summary && 
        result.summary.processing === 0 && 
        result.summary.pending === 0) {
      // Debug log removed
      stopPollingWorker()
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      // Debug log removed
    } else {
      console.error('Polling worker error:', error)
    }
  }
}
const selectImage = (image) => {
  selectedImage.value = image
}
const toggleFavorite = async (image) => {
  try {
    const { error } = await supabase
      .from('gen_images')
      .update({ is_favorite: !image.is_favorite })
      .eq('id', image.id)
    if (error) throw error
    // 로컬 상태 업데이트
    image.is_favorite = !image.is_favorite
  } catch (error) {
    console.error('즐겨찾기 토글 실패:', error)
  }
}
const toggleKeep = async (image) => {
  try {
    const newKeptStatus = !image.is_kept
    const { error } = await supabase
      .from('gen_images')
      .update({ is_kept: newKeptStatus })
      .eq('id', image.id)
    if (error) throw error
    // 로컬 상태 업데이트
    image.is_kept = newKeptStatus
    // 갤러리 재로드
    await fetchImages()
  } catch (error) {
    console.error('보관함 토글 실패:', error)
  }
}
const downloadImage = async (image) => {
  try {
    // 프로젝트 이름 가져오기
    const projectName = projectsStore.currentProject?.name || 'untitled'
    // 씬 번호 가져오기 (연결된 씬이 있는 경우)
    let sceneNumber = ''
    if (image.production_sheet_id || image.linked_scene_id) {
      const sheetId = image.production_sheet_id || image.linked_scene_id
      try {
        const { data } = await supabase
          .from('production_sheets')
          .select('scene_number')
          .eq('id', sheetId)
          .single()
        if (data && data.scene_number) {
          sceneNumber = `_${data.scene_number}`
        }
      } catch (error) {
        console.error('씬 번호 가져오기 실패:', error)
      }
    } else if (image.linked_scene_number) {
      sceneNumber = `_${image.linked_scene_number}`
    }
    // 카테고리 정보 추가
    let category = ''
    if (image.is_character || image.image_type === 'character') {
      category = '_character'
    } else if (image.is_background || image.image_type === 'background') {
      category = '_background'
    } else if (image.is_object || image.image_type === 'object') {
      category = '_object'
    } else if (sceneNumber) {
      category = '_scene'
    }
    // 캐릭터 이름 추가 (있는 경우)
    let characterName = ''
    if (image.element_name) {
      characterName = `_${image.element_name.replace(/[^a-zA-Z0-9가-힣]/g, '_')}`
    }
    // 파일명 생성 (특수문자 제거)
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9가-힣]/g, '_')
    const timestamp = new Date().getTime()
    const fileName = `image_${sanitizedProjectName}${category}${characterName}${sceneNumber}_${timestamp}.png`
    // 이미지 URL 선택 (우선순위: result_image_url > image_url)
    const imageUrl = image.result_image_url || image.image_url
    // 이미지 다운로드 (CORS 문제 회피를 위해 fetch 사용)
    const response = await fetch(imageUrl)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    // 메모리 정리
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('이미지 다운로드 오류:', error)
    // CORS 오류 시 기본 다운로드 시도
    const imageUrl = image.result_image_url || image.image_url
    const link = document.createElement('a')
    link.href = imageUrl
    link.download = `image_${new Date().getTime()}.png`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }
}
const deleteImage = async (image) => {
  if (!confirm('이 이미지를 삭제하시겠습니까?')) {
    return
  }
  try {
    // Storage에서 이미지 파일 삭제
    if (image.result_image_url) {
      // Storage URL에서 파일 경로 추출
      const url = new URL(image.result_image_url)
      const pathParts = url.pathname.split('/storage/v1/object/public/gen-images/')
      if (pathParts[1]) {
        const { error: storageError } = await supabase.storage
          .from('gen-images')
          .remove([pathParts[1]])
        if (storageError) {
          console.error('Storage 이미지 삭제 실패:', storageError)
        }
      }
    }
    // DB에서 레코드 삭제
    const { error } = await supabase
      .from('gen_images')
      .delete()
      .eq('id', image.id)
    if (error) throw error
    // 로컬 상태에서 제거
    const index = images.value.findIndex(img => img.id === image.id)
    if (index !== -1) {
      images.value.splice(index, 1)
    }
    // Debug log removed
  } catch (error) {
    console.error('이미지 삭제 실패:', error)
    alert('이미지 삭제에 실패했습니다.')
  }
}
// Realtime 구독 설정 - 제거됨 (폴링으로 대체)
/* const setupRealtimeSubscription = async () => {
  try {
    // 기존 채널이 있으면 제거
    if (realtimeChannel.value) {
      await supabase.removeChannel(realtimeChannel.value)
      realtimeChannel.value = null
      // 약간의 지연을 두어 연결 정리
      await new Promise(resolve => setTimeout(resolve, 100))
    }
    // 프로젝트 ID가 없으면 실행하지 않음
    if (!props.projectId) {
      console.warn('Project ID가 없어 Realtime 구독을 건너뜁니다.')
      return
    }
    // 새 채널 생성 및 구독 (유니크한 채널명 사용)
    const channelName = `gen_images_${props.projectId}_${Date.now()}`
    // Debug log removed
    realtimeChannel.value = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'gen_images',
          filter: `project_id=eq.${props.projectId}`
        },
        async (payload) => {
          // Debug log removed
          if (payload.eventType === 'INSERT') {
            // 새 이미지 추가
            images.value.unshift(payload.new)
          } else if (payload.eventType === 'UPDATE') {
            // 이미지 업데이트 (생성 완료 등)
            const index = images.value.findIndex(img => img.id === payload.new.id)
            if (index !== -1) {
              images.value[index] = payload.new
            } else {
              // 없으면 추가
              images.value.unshift(payload.new)
            }
            // 생성 완료 시 알림
            if (payload.old.generation_status !== 'completed' && payload.new.generation_status === 'completed') {
              // Debug log removed
              // 선택적: 사용자에게 알림 표시
            }
          } else if (payload.eventType === 'DELETE') {
            // 이미지 삭제
            images.value = images.value.filter(img => img.id !== payload.old.id)
          }
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('Realtime 구독 오류:', err)
        } else {
          // Debug log removed
        }
      })
  } catch (error) {
    console.error('Realtime 설정 오류:', error)
  }
}
const cleanupRealtimeSubscription = async () => {
  if (realtimeChannel.value) {
    try {
      await supabase.removeChannel(realtimeChannel.value)
    } catch (error) {
      console.error('채널 제거 오류:', error)
    } finally {
      realtimeChannel.value = null
    }
  }
} */
const connectToScene = (image) => {
  imageToConnect.value = image
  showSceneModal.value = true
}
const handleSceneConnection = async (result) => {
  try {
    // result 객체에서 sceneId 추출
    const sceneId = result.sceneId
    // 이미지 URL 가져오기 (result_image_url 사용)
    const imageUrl = imageToConnect.value.result_image_url || 
                     imageToConnect.value.thumbnail_url
    if (!imageUrl) {
      throw new Error('이미지 URL을 찾을 수 없습니다.')
    }
    // Debug log removed
    // 1. 먼저 해당 씬에 이미 연결된 다른 이미지들의 production_sheet_id를 null로 업데이트
    const { error: clearError } = await supabase
      .from('gen_images')
      .update({ production_sheet_id: null })
      .eq('production_sheet_id', sceneId)
      .neq('id', imageToConnect.value.id) // 현재 연결하려는 이미지는 제외
    if (clearError) {
      console.error('기존 연결 해제 실패:', clearError)
      // 에러가 발생해도 계속 진행
    }
    // 2. production_sheets 테이블의 scene_image_url 업데이트
    const { error } = await supabase
      .from('production_sheets')
      .update({ scene_image_url: imageUrl })
      .eq('id', sceneId)
    if (error) throw error
    // 3. 현재 이미지의 production_sheet_id 업데이트
    await supabase
      .from('gen_images')
      .update({ production_sheet_id: sceneId })
      .eq('id', imageToConnect.value.id)
    // 이미지 목록 새로고침 (연결 상태 업데이트를 위해)
    await fetchImages()
    // 스토어 업데이트
    await productionStore.fetchProductionSheets(props.projectId)
    showSceneModal.value = false
    // Debug log removed
    alert('이미지가 씬에 연결되었습니다.')
  } catch (error) {
    console.error('씬 연결 실패:', error)
    alert('씬 연결에 실패했습니다.')
  }
}
// 최적화된 이미지 URL 선택
const getOptimizedImageUrl = (item) => {
  console.log('🖼️ 이미지 URL 선택:', {
    id: item.id,
    thumbnail_url: item.thumbnail_url,
    result_image_url: item.result_image_url,
    generation_status: item.generation_status
  })
  
  // 1. 썸네일이 있고 유효하면 우선 사용 (빠른 로딩)
  if (item.thumbnail_url && item.thumbnail_url.length > 10) {
    return item.thumbnail_url
  }
  
  // 2. 썸네일이 없으면 result_image_url 사용
  if (item.result_image_url) {
    return item.result_image_url
  }
  
  // 3. 모든 URL이 없으면 기본 이미지
  return 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="300" height="300"%3E%3Crect fill="%23f0f0f0" width="300" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-size="14"%3E이미지 없음%3C/text%3E%3C/svg%3E'
}

const formatDate = (dateString) => {
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}
// 이미지 로드 에러 처리
const handleImageError = (event) => {
  console.error('Image load error:', event.target.src)
  // 기본 이미지로 대체하거나 에러 처리
  event.target.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23ddd" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3ENo Image%3C/text%3E%3C/svg%3E'
}
const openTagEditor = (image) => {
  imageToEdit.value = image
  showTagModal.value = true
}
const handleTagUpdate = (newTags) => {
  // 로컬 상태 업데이트
  const index = images.value.findIndex(img => img.id === imageToEdit.value.id)
  if (index !== -1) {
    images.value[index].tags = newTags
  }
  showTagModal.value = false
}
// 이미지 클릭 핸들러 - 모바일에서는 더블 클릭으로 상세보기
const handleImageClick = (image) => {
  if (isMobile.value) {
    // 모바일에서는 첫 클릭은 선택, 이미 선택된 이미지를 다시 클릭하면 상세보기
    if (selectedImage.value?.id === image.id) {
      openDetailModal(image)
    } else {
      selectedImage.value = image
    }
  } else {
    // 데스크톱에서는 바로 상세보기
    openDetailModal(image)
  }
}
// 이미지 상세보기 모달 관련
const openDetailModal = (image) => {
  imageToView.value = image
  showDetailModal.value = true
}
const handleImageUpdate = (updatedImage) => {
  // 로컬 상태 업데이트
  const index = images.value.findIndex(img => img.id === updatedImage.id)
  if (index !== -1) {
    images.value[index] = updatedImage
  }
  // 상세보기 모달의 이미지도 업데이트
  if (imageToView.value?.id === updatedImage.id) {
    imageToView.value = updatedImage
  }
}
const openTagEditorFromDetail = (image) => {
  showDetailModal.value = false
  imageToEdit.value = image
  showTagModal.value = true
}
const connectToSceneFromDetail = (image) => {
  showDetailModal.value = false
  imageToConnect.value = image
  showSceneModal.value = true
}
const handleEditImage = (editData) => {
  // 이미지 수정 데이터 설정
  editImageData.value = editData
  currentPrompt.value = editData.prompt || ''
  currentCharacter.value = editData.name || ''
  // 생성 모달 열기
  showGenerationModal.value = true
}
const handleGenerateVideo = (videoData) => {
  // 비디오 생성 모달에 데이터 전달
  videoPrompt.value = videoData.prompt || ''
  videoReferenceImage.value = videoData.imageUrl || null
  // 비디오 생성 모달 열기
  showVideoModal.value = true
}

// Recraft 편집 핸들러들
const handleVectorize = (image) => {
  vectorizeImageData.value = {
    imageUrl: image.imageUrl,
    imageId: image.imageId
  }
  showVectorizeModal.value = true
  showDetailModal.value = false
}

const handleUpscale = (image) => {
  upscaleImageData.value = {
    imageUrl: image.imageUrl,
    imageId: image.imageId
  }
  showUpscaleModal.value = true
  showDetailModal.value = false
}

const handleRemoveBackground = (image) => {
  removeBackgroundImageData.value = {
    imageUrl: image.imageUrl,
    imageId: image.imageId
  }
  showRemoveBackgroundModal.value = true
  showDetailModal.value = false
}

const handleVectorizeSuccess = (result) => {
  console.log('Vectorize success:', result)
  // 갤러리 새로고침하여 새 이미지 표시
  fetchImages()
  // 상세 모달이 열려있다면 처리된 이미지들 새로고침
  if (showDetailModal.value && imageToView.value) {
    // 약간의 딜레이 후 새로고침 (데이터베이스에 저장이 완료될 시간)
    setTimeout(() => {
      imageToView.value = { ...imageToView.value }
    }, 1000)
  }
}

const handleUpscaleSuccess = (result) => {
  console.log('Upscale success:', result)
  // 갤러리 새로고침하여 새 이미지 표시
  fetchImages()
  // 상세 모달이 열려있다면 처리된 이미지들 새로고침
  if (showDetailModal.value && imageToView.value) {
    setTimeout(() => {
      imageToView.value = { ...imageToView.value }
    }, 1000)
  }
}

const handleRemoveBackgroundSuccess = (result) => {
  console.log('Remove background success:', result)
  // 갤러리 새로고침하여 새 이미지 표시
  fetchImages()
  // 상세 모달이 열려있다면 처리된 이미지들 새로고침
  if (showDetailModal.value && imageToView.value) {
    setTimeout(() => {
      imageToView.value = { ...imageToView.value }
    }, 1000)
  }
}
const closeVideoModal = () => {
  showVideoModal.value = false
  videoPrompt.value = ''
  videoReferenceImage.value = null
}
const handleVideoGenerated = () => {
  // 비디오 생성 성공 시 처리
  closeVideoModal()
  // 비디오 갤러리로 전환하거나 알림 표시 등
  // Debug log removed
}
// 웹훅 업데이트 처리
const handleMediaUpdate = (event) => {
  const update = event.detail
  // Debug log removed
  // 이미지 완료 업데이트인 경우
  if (update.event === 'image-completed' && update.project_id === props.projectId) {
    // 갤러리 새로고침
    fetchImages()
  }
}

// 실패 복구 시스템 업데이트 처리
const handleGenerationStatusUpdated = async (event) => {
  const update = event.detail
  console.log('Generation status updated:', update)
  
  if (update.type === 'recovery') {
    // 실패 복구에 의한 업데이트이므로 갤러리 새로고침
    await fetchImages()
    console.log('Gallery refreshed due to recovery system')
  }
}
// 필터 변경 감지
watch(showKeptOnly, () => {
  currentPage.value = 1
  fetchImages()
})
watch(filterCategory, () => {
  currentPage.value = 1
  fetchImages()
})
// Lifecycle
onMounted(async () => {
  // Debug log removed
  // 리사이즈 이벤트 리스너 설정
  window.addEventListener('resize', handleResize)
  // localStorage에서 저장된 캐릭터 이미지 선택 복원
  const savedSelections = JSON.parse(localStorage.getItem('characterImageSelections') || '{}')
  Object.entries(savedSelections).forEach(([key, imageUrl]) => {
    if (key.startsWith(`${props.projectId}-`)) {
      const characterName = key.replace(`${props.projectId}-`, '')
      customCharacterImageMap.value.set(characterName, imageUrl)
    }
  })
  // 1. 먼저 스토리보드 데이터 로드
  if (!productionStore.productionSheets.length) {
    await productionStore.fetchProductionSheets(props.projectId)
  }
  // 2. 캐릭터 이미지 먼저 로드 (상단 제안 섹션용)
  await fetchCharacterImages()
  // Debug log removed
  // 3. 그 다음 갤러리 이미지 로드
  await fetchImages()
  // Debug log removed
  // 스크롤 리스너 설정
  await nextTick()
  setupScrollListener()
  // Tab 변경 감지를 위한 MutationObserver 설정
  const observer = new MutationObserver(() => {
    // Debug log removed
    setupScrollListener()
  })
  // tab-content의 부모 요소 감시
  const tabsContainer = document.querySelector('.tabs-container')
  if (tabsContainer) {
    observer.observe(tabsContainer, { childList: true, subtree: true })
  }
  // 개발 환경에서는 폴링 사용
  if (import.meta.env.MODE === 'development') {
    if (processingImages.value.length > 0) {
      // Debug log removed
      startPollingWorker()
    }
  } else {
    // 프로덕션 환경에서도 폴링 사용 (Realtime 비용 문제로 임시 비활성화)
    // productionStore.setupRealtimeSubscription(props.projectId)
    // setupRealtimeSubscription()
    // 프로덕션에서도 처리 중인 이미지가 있으면 폴링
    if (processingImages.value.length > 0) {
      // Debug log removed
      startPollingWorker()
    }
  }
  // 미디어 업데이트 이벤트 리스너 등록
  window.addEventListener('media-update', handleMediaUpdate)
  // 실패 복구 시스템 이벤트 리스너 등록
  window.addEventListener('generation-status-updated', handleGenerationStatusUpdated)
})
// 컴포넌트 언마운트 시 폴링 중지
onUnmounted(() => {
  // Realtime 구독 해제 - 비활성화
  // cleanupRealtimeSubscription()
  stopPollingWorker()
  // 프로덕션 환경에서 Realtime 구독 해제 - 비활성화
  // if (import.meta.env.MODE === 'production') {
  //   productionStore.cleanupRealtimeSubscription()
  // }
  // 이벤트 리스너 제거
  window.removeEventListener('media-update', handleMediaUpdate)
  window.removeEventListener('generation-status-updated', handleGenerationStatusUpdated)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('scroll', handleScroll)
  // 갤러리 리스너도 제거
  const gallery = document.querySelector('.ai-generation-gallery')
  if (gallery) {
    gallery.removeEventListener('scroll', handleScroll)
  }
})
// Supabase Realtime 설정 (웹훅 결과 수신용)
let realtimeChannel = null
const setupRealtimeSubscription = () => {
  // Debug log removed
  realtimeChannel = supabase
    .channel(`images-${props.projectId}`)
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'gen_images',
        filter: `project_id=eq.${props.projectId}`
      },
      (payload) => {
        // Debug log removed
        handleImageUpdate(payload.new)
      }
    )
    .subscribe()
}
const cleanupRealtimeSubscription = () => {
  if (realtimeChannel) {
    // Debug log removed
    supabase.removeChannel(realtimeChannel)
    realtimeChannel = null
  }
}
// projectId 변경 감지
watch(() => props.projectId, async (newId, oldId) => {
  if (newId && newId !== oldId) {
    // Realtime 구독 재설정 - 비활성화
    // cleanupRealtimeSubscription()
    // setupRealtimeSubscription()
    // 폴링 중지 후 재시작
    stopPollingWorker()
    // 이미지 목록 초기화 및 새 데이터 로드
    images.value = []
    processingImages.value = []
    loading.value = true
    filterCategory.value = 'all'
    await fetchImages()
    // 처리 중인 이미지가 있으면 폴링 시작
    if (processingImages.value.length > 0) {
      // Debug log removed
      startPollingWorker()
    }
    // 스토리보드 데이터도 다시 로드
    await productionStore.fetchProductionSheets(newId)
  }
})
// Method to set filter category from parent
const setFilterCategory = (category) => {
  filterCategory.value = category
}
// 보관함 토글 메서드
const toggleKeptView = (showKept) => {
  showKeptOnly.value = showKept
}
// Expose method for parent component
defineExpose({
  openGenerationModal,
  setFilterCategory,
  filterCategory,
  toggleKeptView,
  refreshScrollListener: setupScrollListener,
  fetchImages // 자료 저장 후 새로고침용
})
</script>
<style scoped>
.ai-generation-gallery {
  padding: 20px;
  padding-top: 10px;
  height: 100%;
  overflow-y: auto;
}
/* 캐릭터 제안 섹션 */
.suggestions-section {
  margin-bottom: 24px;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--border-color);
}
.suggestions-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 12px;
}
.suggestions-scroll-container {
  position: relative;
  overflow-x: auto;
  overflow-y: hidden;
  padding-bottom: 4px; /* 스크롤바 공간 */
}
.suggestions-list {
  display: flex;
  gap: 12px;
  padding: 2px; /* 그림자를 위한 여백 */
}
.suggestion-card-small {
  flex-shrink: 0;
  width: 120px; /* 기존 카드의 절반 너비 */
  height: 150px; /* 기존 카드의 절반 높이 */
  border: 2px dashed var(--border-color);
  background: var(--bg-secondary);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;
  padding: 12px;
  position: relative;
  overflow: hidden;
}
.suggestion-card-small.has-image {
  padding: 0;
  border: none;
  background: transparent;
}
.character-full-image {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
}
.character-full-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.character-placeholder {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--border-color);
}
.suggestion-icon-small {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  color: var(--text-secondary);
  opacity: 0.5;
}
.character-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 8px;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.2s;
}
/* 데스크톱에서 desktop-visible 클래스가 있으면 항상 표시 */
@media (hover: hover) {
  .character-overlay.desktop-visible {
    opacity: 1;
  }
  /* 호버 시에는 배경을 더 진하게 */
  .suggestion-card-small:hover .character-overlay.desktop-visible {
    background: linear-gradient(to top, rgba(0, 0, 0, 0.9), rgba(0, 0, 0, 0.3));
  }
}
/* 모바일에서는 항상 표시 및 배경 더 연하게 */
@media (hover: none) {
  .character-overlay {
    opacity: 1;
    background: linear-gradient(to top, rgba(0, 0, 0, 0.6), transparent);
  }
}
.character-overlay h6 {
  color: white;
  margin: 0;
  font-size: 0.9rem;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
}
.character-actions {
  display: flex;
  gap: 4px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
}
.btn-settings,
.btn-library {
  background: rgba(0, 0, 0, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: white;
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 28px;
  height: 28px;
}
.btn-settings:hover,
.btn-library:hover {
  background: rgba(0, 0, 0, 0.9);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.5);
  border-color: rgba(255, 255, 255, 0.4);
}
.btn-regenerate {
  padding: 4px 12px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-regenerate:hover {
  background: var(--primary-hover);
  transform: scale(1.05);
}
.character-placeholder {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 8px;
  overflow: hidden;
  background: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px dashed var(--border-color);
}
.character-placeholder .suggestion-icon-small {
  color: var(--text-tertiary);
  opacity: 0.5;
}
.btn-generate-small {
  padding: 4px 12px;
  background: var(--success-color, #10B981);
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 0.75rem;
  cursor: pointer;
  transition: all 0.2s;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-generate-small:hover {
  background: var(--success-hover, #059669);
  transform: scale(1.05);
}
.suggestion-card-small:not(.has-image):hover {
  border-color: var(--primary-color);
  background: var(--bg-tertiary);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}
.suggestion-card-small.has-image:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}
.suggestion-icon-small {
  margin-bottom: 8px;
  opacity: 0.7;
  color: var(--text-secondary);
}
/* 캐릭터 카드의 h6는 오버레이 안에 있으므로 이 스타일 삭제 */
/* 스크롤바 스타일링 */
.suggestions-scroll-container::-webkit-scrollbar {
  height: 6px;
}
.suggestions-scroll-container::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 3px;
}
.suggestions-scroll-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 3px;
}
.suggestions-scroll-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}
.suggestion-icon {
  margin-bottom: 12px;
  opacity: 0.7;
  color: var(--text-secondary);
}
.suggestion-content h5 {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 6px;
  color: var(--text-primary);
}
.suggestion-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 16px;
}
.btn-generate {
  padding: 6px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.btn-generate:hover {
  background: var(--primary-dark);
}
/* 갤러리 섹션 */
.gallery-section {
  margin-top: 0;
}
/* Gallery controls */
.gallery-controls {
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}
.filter-buttons {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}
.filter-btn {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  white-space: nowrap;
}
.filter-btn:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-color: var(--primary-color-light);
}
.filter-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}
.column-control-wrapper {
  display: flex;
  align-items: center;
}
.mobile-filter {
  margin-bottom: 1rem;
  display: flex;
  justify-content: center;
}
.filter-select {
  padding: 0.5rem 1rem;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  min-width: 150px;
}
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}
.section-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}
.filter-select {
  padding: 6px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 0.9rem;
}
/* 통합 갤러리 - Masonry 레이아웃 */
.image-grid {
  /* CSS 멀티 컬럼 레이아웃 사용 */
  column-gap: 20px;
  padding: 0;
  transition: column-count 0.3s ease;
}
/* 반응형 미디어 쿼리는 컬럼 컨트롤이 없을 때만 적용 */
@media (max-width: 1440px) {
  .image-grid:not([style*="column-count"]) {
    column-count: 3;
  }
}
@media (max-width: 900px) {
  .image-grid:not([style*="column-count"]) {
    column-count: 2;
  }
}
@media (max-width: 600px) {
  .image-grid {
    column-count: 1 !important; /* 모바일에서는 항상 1열 */
  }
}
.gallery-item {
  position: relative;
  border-radius: 12px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  break-inside: avoid; /* 컬럼 중간에서 아이템이 잘리지 않도록 */
  margin-bottom: 20px; /* 아래 간격 */
  display: inline-block; /* 컬럼 레이아웃에서 올바르게 표시 */
  width: 100%; /* 컬럼 너비에 맞춤 */
}
/* 생성 제안 카드 스타일 */
.gallery-item.suggestion-card {
  border: 2px dashed var(--border-color);
  background: var(--bg-secondary);
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}
.gallery-item.suggestion-card:hover {
  border-color: var(--primary-color);
  background: var(--bg-tertiary);
  transform: scale(1.02); /* translateY 대신 scale 사용 - Masonry에서 더 안정적 */
}
.suggestion-content {
  text-align: center;
  padding: 20px;
}
/* 생성된 이미지 카드 스타일 */
.gallery-item.image-card {
  border: 1px solid var(--border-color);
  background: var(--bg-secondary);
}
.gallery-item.image-card:hover,
.gallery-item.image-card.selected {
  border-color: var(--primary-color);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  transform: scale(1.02); /* translateY 대신 scale 사용 - Masonry에서 더 안정적 */
  z-index: 10; /* 호버 시 다른 카드 위에 표시 */
}
.image-wrapper {
  position: relative;
  width: 100%;
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 100px;
}
.image-wrapper img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  /* 최대 높이 제한 제거 - 원본 비율 유지 */
}
/* 오버레이 정보 */
.image-overlay-info {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(to bottom, 
    rgba(0,0,0,0.7) 0%, 
    transparent 30%,
    transparent 70%,
    rgba(0,0,0,0.8) 100%);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
  opacity: 0;
  transition: opacity 0.3s;
}
.gallery-item.image-card:hover .image-overlay-info {
  opacity: 1;
}
.info-top {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
.info-bottom {
  color: white;
  text-shadow: 0 1px 3px rgba(0,0,0,0.8);
}
.model-size-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
  gap: 8px;
}

.info-bottom .image-model {
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 0;
}

.info-bottom .image-size {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.5);
  border-radius: 4px;
  white-space: nowrap;
}
.info-bottom .image-character {
  font-size: 0.9rem;
  color: white;
  opacity: 0.9;
}
.btn-favorite,
.btn-keep,
.btn-connect,
.btn-tags {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  border: none;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(10px);
  color: white;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  font-size: 1.1rem;
}
.btn-favorite:hover,
.btn-keep:hover,
.btn-connect:hover,
.btn-tags:hover,
.btn-download:hover,
.btn-delete:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}
.btn-download {
  background: rgba(34, 197, 94, 0.2);
  backdrop-filter: blur(10px);
  color: #22c55e;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-download:hover {
  background: rgba(34, 197, 94, 0.4);
  color: white;
}
.btn-delete {
  background: rgba(239, 68, 68, 0.2);
  backdrop-filter: blur(10px);
  color: #ef4444;
  border-radius: 8px;
  width: 32px;
  height: 32px;
  padding: 0;
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}
.btn-delete:hover {
  background: rgba(239, 68, 68, 0.4);
  color: white;
}
.btn-favorite.active {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.3);
}
.btn-keep.active {
  color: #60a5fa;
  background: rgba(96, 165, 250, 0.3);
}
.btn-connect.connected {
  color: #4ade80; /* Kairos AI 초록색 */
  background: rgba(74, 222, 128, 0.3);
  border: 1px solid rgba(74, 222, 128, 0.5);
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
  color: var(--text-secondary);
  font-size: 0.9rem;
}
/* 페이지네이션 컨트롤 */
.pagination-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  flex-wrap: wrap;
}
.page-numbers {
  display: flex;
  gap: 4px;
}
.page-btn {
  min-width: 36px;
  height: 36px;
  padding: 0 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}
.page-btn:hover:not(:disabled) {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}
.page-btn.active {
  background: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}
.page-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.page-info {
  margin-left: 16px;
  color: var(--text-secondary);
  font-size: 14px;
}
@media (max-width: 768px) {
  .pagination-controls {
    padding: 16px;
  }
  .page-info {
    width: 100%;
    text-align: center;
    margin-left: 0;
    margin-top: 8px;
  }
}
.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}
/* 실패한 이미지 스타일 */
.failed-wrapper {
  background: var(--bg-secondary);
  border-color: rgba(239, 68, 68, 0.5) !important;
}
.failed-image {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  min-height: 200px;
  text-align: center;
  background: rgba(239, 68, 68, 0.1);
  border-radius: 8px;
}
.failed-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}
.failed-text {
  font-size: 1rem;
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 4px;
}
.failed-model {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.failed-reason {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  max-width: 200px;
  word-wrap: break-word;
  line-height: 1.3;
}
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
.empty-icon {
  margin-bottom: 16px;
  opacity: 0.5;
  color: var(--text-secondary);
}
.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.hint {
  font-size: 0.9rem;
  color: var(--text-tertiary);
}
/* 태그 스타일 */
.image-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}
.tag-chip {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  font-size: 0.75rem;
  color: white;
  border: 1px solid rgba(255, 255, 255, 0.2);
  white-space: nowrap;
}
.tag-more {
  padding: 2px 8px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  border-radius: 12px;
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.7);
  font-style: italic;
}
/* 처리 중인 이미지 섹션 */
/* 처리 중인 이미지 카드 */
.gallery-item.processing-card {
  border: 2px solid var(--primary-color);
  background: var(--bg-secondary);
  animation: pulse 2s ease-in-out infinite;
  cursor: default;
  aspect-ratio: 1; /* 처리 중인 카드도 정사각형으로 유지 */
}
@keyframes pulse {
  0%, 100% { 
    opacity: 1; 
    border-color: var(--primary-color);
  }
  50% { 
    opacity: 0.7; 
    border-color: var(--border-color);
  }
}
.processing-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px; /* 최소 높이 증가 */
  aspect-ratio: 1; /* 정사각형 유지 */
}
.processing-animation {
  text-align: center;
}
.processing-text {
  margin-top: 16px;
  font-size: 0.95rem;
  color: var(--text-primary);
  font-weight: 500;
}
.processing-model {
  margin-top: 8px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}
/* 모바일 반응형 스타일 */
@media (max-width: 768px) {
  .ai-generation-gallery {
    padding: 10px 0;
  }
  .suggestions-section {
    padding: 0 10px 20px 10px;
  }
  .gallery-section {
    padding: 0 10px;
  }
  .loading-state,
  .error-message {
    padding: 40px 10px;
  }
}
@media (max-width: 480px) {
  .ai-generation-gallery {
    padding: 5px 0;
  }
  .suggestions-section {
    padding: 0 5px 15px 5px;
  }
  .gallery-section {
    padding: 0 5px;
  }
}
/* 캐릭터 생성 제안 카드 스타일 */
.suggestion-card {
  cursor: pointer;
  transition: transform 0.2s;
}
.suggestion-card:hover {
  transform: translateY(-2px);
}
.suggestion-wrapper {
  background: var(--bg-secondary);
  border: 2px dashed var(--border-color);
  border-radius: 12px;
  aspect-ratio: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.suggestion-content {
  text-align: center;
  padding: 20px;
}
.suggestion-icon {
  color: var(--text-tertiary);
  margin-bottom: 12px;
}
.suggestion-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  margin-bottom: 8px;
}
.suggestion-name {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}
.suggestion-existing {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  opacity: 0.1;
}
.suggestion-existing img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
</style>