<template>
  <div class="ai-generation-gallery">
    <!-- 통합 갤러리 섹션 -->
    <div class="gallery-section">
      <!-- 필터는 상위 컴포넌트로 이동 -->

      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>이미지를 불러오는 중...</p>
      </div>

      <div v-if="combinedGalleryItems.length === 0 && processingImages.length === 0" class="empty-state">
        <div class="empty-icon">🖼️</div>
        <p>아직 생성된 이미지가 없습니다.</p>
        <p class="hint">새 이미지 생성 버튼을 눌러 시작하세요.</p>
      </div>

      <div v-else class="image-grid">
        <!-- 생성 제안 카드와 생성된 이미지 통합 표시 -->
        <div 
          v-for="item in combinedGalleryItems" 
          :key="item.id || item.character"
          class="gallery-item"
          :class="{ 
            'suggestion-card': item.type === 'suggestion',
            'image-card': item.type === 'image',
            'processing-card': item.type === 'processing',
            'selected': item.type === 'image' && selectedImage?.id === item.id 
          }"
          @click="item.type === 'image' ? openDetailModal(item) : item.type === 'suggestion' ? openGenerationModal(item.character) : null"
        >
          <!-- 생성 제안 카드 -->
          <template v-if="item.type === 'suggestion'">
            <div class="suggestion-content">
              <div class="suggestion-icon">👤</div>
              <h5>{{ item.character }}</h5>
              <p class="suggestion-hint">캐릭터 이미지 생성</p>
              <button 
                @click.stop="openGenerationModal(item.character)" 
                class="btn-generate"
              >
                생성하기
              </button>
            </div>
          </template>
          
          <!-- 처리 중인 이미지 카드 -->
          <template v-else-if="item.type === 'processing'">
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
            <div class="image-wrapper">
              <img 
                :src="item.thumbnail_url || item.storage_image_url || item.result_image_url" 
                :alt="item.prompt_used || 'AI Generated Image'"
                loading="lazy"
                @error="handleImageError"
              />
              <div class="image-overlay-info">
                <div class="info-top">
                  <button 
                    @click.stop="toggleFavorite(item)"
                    class="btn-favorite"
                    :class="{ active: item.is_favorite }"
                  >
                    {{ item.is_favorite ? '⭐' : '☆' }}
                  </button>
                  <button 
                    @click.stop="connectToScene(item)"
                    class="btn-connect"
                    :class="{ connected: item.production_sheet_id }"
                    title="스토리보드에 연결"
                  >
                    🔗
                  </button>
                  <button 
                    @click.stop="openTagEditor(item)"
                    class="btn-tags"
                    title="태그 편집"
                  >
                    🏷️
                  </button>
                </div>
                <div class="info-bottom">
                  <p class="image-model">{{ item.generation_model || 'Unknown' }}</p>
                  <p v-if="item.element_name" class="image-character">
                    👤 {{ item.element_name }}
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
    </div>

    <!-- 이미지 생성 모달 -->
    <ImageGenerationModal
      v-if="showGenerationModal"
      :show="showGenerationModal"
      :project-id="projectId"
      :initial-prompt="currentPrompt"
      :character-name="currentCharacter"
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
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { useProductionStore } from '@/stores/production'
import ImageGenerationModal from './ImageGenerationModal.vue'
import SceneConnectionModal from './SceneConnectionModal.vue'
import TagEditModal from './TagEditModal.vue'
import ImageDetailModal from './ImageDetailModal.vue'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  }
})

const productionStore = useProductionStore()

// State
const loading = ref(false)
const images = ref([])
const selectedImage = ref(null)
const filterCategory = ref('')
const showGenerationModal = ref(false)
const showSceneModal = ref(false)
const showTagModal = ref(false)
const showDetailModal = ref(false)
const currentPrompt = ref('')
const currentCharacter = ref('')
const imageToConnect = ref(null)
const imageToEdit = ref(null)
const imageToView = ref(null)
// const realtimeChannel = ref(null) - Realtime 제거

// Computed
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
  
  // 아직 생성되지 않은 캐릭터만 제안
  return Array.from(allCharacters).filter(char => !generatedCharacters.has(char))
})

// 필터링된 이미지 목록
const filteredImages = computed(() => {
  // completed 상태의 이미지만 표시
  let filtered = images.value.filter(img => {
    return img.generation_status === 'completed'
  })
  
  if (filterCategory.value) {
    filtered = filtered.filter(img => img.image_type === filterCategory.value)
  }
  
  return filtered
})

// 생성 제안 카드와 생성된 이미지를 통합한 갤러리 아이템
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
const fetchImages = async () => {
  loading.value = true
  
  try {
    // gen_images 테이블에서 데이터 가져오기
    const { data, error } = await supabase
      .from('gen_images')
      .select('*')
      .eq('project_id', props.projectId)
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    console.log('Fetched images from gen_images:', data) // 디버깅용 로그
    images.value = data || []
  } catch (error) {
    console.error('이미지 로드 실패:', error)
  } finally {
    loading.value = false
  }
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

const closeGenerationModal = () => {
  showGenerationModal.value = false
  currentPrompt.value = ''
  currentCharacter.value = ''
}

const handleGenerationSuccess = async (result) => {
  closeGenerationModal()
  
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
  console.log('Starting polling worker...')
  
  // 기존 폴링 중지
  if (pollingWorkerInterval) {
    clearInterval(pollingWorkerInterval)
  }
  
  // 폴링 시작 시간 기록
  const startTime = Date.now()
  let pollCount = 0
  const maxPolls = 40 // 최대 40회 (5초 * 40 = 200초)
  
  // 즉시 한 번 실행
  callPollingWorker()
  pollCount++
  
  // 5초마다 폴링 워커 호출
  pollingWorkerInterval = setInterval(async () => {
    // 최대 폴링 횟수 또는 시간 초과 체크
    if (pollCount >= maxPolls || Date.now() - startTime > 200000) {
      console.log('Polling limit reached, stopping...')
      stopPollingWorker()
      return
    }
    
    // 처리 중인 이미지가 없으면 중지
    if (processingImages.value.length === 0) {
      console.log('No processing images, stopping polling')
      stopPollingWorker()
      return
    }
    
    await callPollingWorker()
    pollCount++
  }, 5000)
}

// 폴링 워커 중지
const stopPollingWorker = () => {
  console.log('Stopping polling worker...')
  if (pollingWorkerInterval) {
    clearInterval(pollingWorkerInterval)
    pollingWorkerInterval = null
  }
}

// 폴링 워커 호출
const callPollingWorker = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      stopPollingWorker()
      return
    }
    
    console.log('Calling polling worker...')
    
    // imagePollingWorker가 404일 경우 processImageQueue 사용 (서버 재시작 필요)
    const response = await fetch('/.netlify/functions/processImageQueue', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({})
    })
    
    if (!response.ok) {
      console.error('Polling worker failed:', response.status)
      return
    }
    
    const result = await response.json()
    console.log('Polling worker result:', result)
    
    // 완료된 이미지가 있으면 갤러리 새로고침
    if (result.summary && result.summary.completed > 0) {
      console.log(`${result.summary.completed}개 이미지 생성 완료, 갤러리 새로고침`)
      await fetchImages() // 갤러리 데이터 새로고침
    }
    
    // 처리 중인 이미지 다시 확인
    const stillProcessing = images.value.filter(
      img => img.generation_status === 'pending' || img.generation_status === 'processing'
    )
    
    // 모든 이미지가 완료되거나 실패하면 폴링 중지
    if (stillProcessing.length === 0) {
      console.log('All images processed, stopping polling')
      stopPollingWorker()
    } else if (result.summary && 
               result.summary.processing === 0 && 
               result.summary.pending === 0) {
      console.log('No more images to process, stopping polling')
      stopPollingWorker()
    }
  } catch (error) {
    console.error('Polling worker error:', error)
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
    console.log('Realtime 채널 생성:', channelName)
    
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
          console.log('실시간 업데이트:', payload)
          
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
              console.log('이미지 생성 완료!', payload.new)
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
          console.log('Realtime 구독 상태:', status)
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
    
    // 이미지 URL 가져오기 (storage_image_url 우선, 없으면 result_image_url 사용)
    const imageUrl = imageToConnect.value.storage_image_url || 
                     imageToConnect.value.result_image_url || 
                     imageToConnect.value.thumbnail_url
    
    if (!imageUrl) {
      throw new Error('이미지 URL을 찾을 수 없습니다.')
    }
    
    console.log('Connecting image to scene:', { sceneId, imageUrl, result })
    
    // production_sheets 테이블의 scene_image_url 업데이트
    const { error } = await supabase
      .from('production_sheets')
      .update({ scene_image_url: imageUrl })
      .eq('id', sceneId)
    
    if (error) throw error
    
    // gen_images 테이블의 production_sheet_id 업데이트
    await supabase
      .from('gen_images')
      .update({ production_sheet_id: sceneId })
      .eq('id', imageToConnect.value.id)
    
    // 스토어 업데이트
    await productionStore.fetchProductionSheets(props.projectId)
    
    showSceneModal.value = false
    console.log('이미지가 씬에 연결되었습니다.')
    alert('이미지가 씬에 연결되었습니다.')
  } catch (error) {
    console.error('씬 연결 실패:', error)
    alert('씬 연결에 실패했습니다.')
  }
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

// Lifecycle
onMounted(async () => {
  await fetchImages()
  // 스토리보드 데이터도 로드
  if (!productionStore.productionSheets.length) {
    await productionStore.fetchProductionSheets(props.projectId)
  }
  
  // Realtime 구독 시작
  // setupRealtimeSubscription() - Realtime 제거, 폴링 사용
  
  // 처리 중인 이미지가 있으면 폴링 시작
  if (processingImages.value.length > 0) {
    console.log(`Found ${processingImages.value.length} processing images, starting polling...`)
    startPollingWorker()
  }
})

// 컴포넌트 언마운트 시 Realtime 구독 해제 및 폴링 중지
onUnmounted(() => {
  // cleanupRealtimeSubscription() - Realtime 제거
  stopPollingWorker()
})

// Method to set filter category from parent
const setFilterCategory = (category) => {
  filterCategory.value = category
}

// Expose method for parent component
defineExpose({
  openGenerationModal,
  setFilterCategory,
  filterCategory
})
</script>

<style scoped>
.ai-generation-gallery {
  padding: 20px;
  padding-top: 10px;
  height: 100%;
  overflow-y: auto;
}

.suggestion-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  opacity: 0.7;
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
  column-count: 2; /* 모바일: 2열 */
  column-gap: 20px;
  padding: 0;
}

/* 태블릿 */
@media (min-width: 768px) {
  .image-grid {
    column-count: 3; /* 3열 */
  }
}

/* 데스크탑 */
@media (min-width: 1024px) {
  .image-grid {
    column-count: 3; /* 3열 */
  }
}

/* 대형 데스크탑 */
@media (min-width: 1440px) {
  .image-grid {
    column-count: 4; /* 4열 */
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

.info-bottom .image-model {
  font-size: 0.85rem;
  font-weight: 500;
  margin-bottom: 4px;
}

.info-bottom .image-character {
  font-size: 0.9rem;
  color: white;
  opacity: 0.9;
}

.btn-favorite,
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
.btn-connect:hover,
.btn-tags:hover {
  background: rgba(255, 255, 255, 0.3);
  transform: scale(1.1);
}

.btn-favorite.active {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.3);
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

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 16px;
  opacity: 0.5;
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
</style>