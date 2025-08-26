<template>
  <div v-if="isOpen" class="modal-overlay" @click.self="close">
    <div class="modal-container library-selector-modal">
      <div class="modal-header">
        <h3>라이브러리에서 "{{ characterName }}" 캐릭터 이미지 선택</h3>
        <button @click="close" class="close-btn">✕</button>
      </div>
      
      <div class="modal-body">
        <!-- 검색 바 -->
        <div class="search-bar">
          <input 
            v-model="searchQuery"
            type="text"
            placeholder="이미지 검색..."
            @input="debouncedSearch"
          />
        </div>
        
        <!-- 이미지 그리드 -->
        <div v-if="loading" class="loading-state">
          <Loader :size="32" class="loading-icon" />
          <p>이미지 로드 중...</p>
        </div>
        
        <div v-else-if="images.length === 0" class="empty-state">
          <p>라이브러리에 이미지가 없습니다</p>
        </div>
        
        <div v-else class="images-grid">
          <div 
            v-for="image in images"
            :key="image.id"
            class="library-image-card"
            :class="{ selected: selectedImage?.id === image.id }"
            @click="selectImage(image)"
          >
            <img 
              :src="image.thumbnail_url || image.storage_image_url" 
              :alt="image.prompt_used"
            />
            <div v-if="image.prompt_used" class="image-prompt">
              {{ image.prompt_used.substring(0, 50) }}...
            </div>
          </div>
        </div>
      </div>
      
      <div class="modal-footer">
        <button @click="close" class="btn-cancel">취소</button>
        <button 
          @click="confirmSelection" 
          class="btn-primary"
          :disabled="!selectedImage"
        >
          선택
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import { supabase } from '@/utils/supabase'
import { Loader } from 'lucide-vue-next'

const props = defineProps({
  isOpen: Boolean,
  characterName: String,
  projectId: String
})

const emit = defineEmits(['close', 'select'])

const images = ref([])
const loading = ref(false)
const searchQuery = ref('')
const selectedImage = ref(null)
let searchTimeout = null

// 모달이 열릴 때 이미지 로드
watch(() => props.isOpen, (newVal) => {
  if (newVal) {
    loadImages()
    selectedImage.value = null
    searchQuery.value = ''
  }
})

// 라이브러리 이미지 로드
const loadImages = async () => {
  loading.value = true
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return

    let query = supabase
      .from('gen_images')
      .select('*')
      .eq('project_id', props.projectId)
      .eq('generation_status', 'completed')
      .eq('element_category', 'character') // 캐릭터 카테고리만
      .neq('is_shared', true) // is_shared가 true인 것은 제외
      .order('created_at', { ascending: false })
      .limit(100)

    // 검색어가 있으면 필터 적용
    if (searchQuery.value) {
      query = query.ilike('prompt_used', `%${searchQuery.value}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('이미지 로드 실패:', error)
      return
    }

    images.value = data || []
  } catch (error) {
    console.error('이미지 로드 중 오류:', error)
  } finally {
    loading.value = false
  }
}

// 검색 디바운스
const debouncedSearch = () => {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    loadImages()
  }, 300)
}

// 이미지 선택
const selectImage = (image) => {
  selectedImage.value = image
}

// 선택 확인
const confirmSelection = async () => {
  if (!selectedImage.value) return
  
  try {
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) return

    // 새로운 gen_images 레코드 생성 (is_shared = true로)
    const { data: newImage, error } = await supabase
      .from('gen_images')
      .insert([{
        project_id: props.projectId,
        prompt_used: `[캐릭터: ${props.characterName}] ${selectedImage.value.prompt_used || ''}`,
        generation_status: 'completed',
        generation_model: selectedImage.value.generation_model,
        element_category: 'character', // 캐릭터 카테고리로 설정
        element_name: props.characterName, // 캐릭터 이름 설정
        storage_image_url: selectedImage.value.storage_image_url,
        thumbnail_url: selectedImage.value.thumbnail_url,
        is_shared: true, // 중복 방지를 위한 플래그
        is_kept: false,
        is_favorite: false,
        metadata: {
          ...selectedImage.value.metadata,
          original_image_id: selectedImage.value.id,
          shared_from: 'library',
          character_name: props.characterName
        }
      }])
      .select()
      .single()

    if (error) {
      console.error('이미지 연동 실패:', error)
      alert('이미지 연동에 실패했습니다.')
      return
    }

    // 부모 컴포넌트에 선택된 이미지 전달
    emit('select', {
      characterName: props.characterName,
      imageUrl: newImage.storage_image_url || newImage.thumbnail_url,
      imageData: newImage
    })

    close()
  } catch (error) {
    console.error('이미지 연동 중 오류:', error)
    alert('이미지 연동 중 오류가 발생했습니다.')
  }
}

// 모달 닫기
const close = () => {
  emit('close')
}
</script>

<style scoped>
.library-selector-modal {
  max-width: 900px;
  width: 90%;
  max-height: 80vh;
}

.modal-body {
  padding: 20px;
  max-height: 60vh;
  overflow-y: auto;
}

.search-bar {
  margin-bottom: 20px;
}

.search-bar input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 14px;
}

.images-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 15px;
}

.library-image-card {
  border: 2px solid transparent;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.3s;
  background: var(--card-bg);
}

.library-image-card:hover {
  transform: scale(1.05);
  box-shadow: var(--shadow-md);
}

.library-image-card.selected {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.2);
}

.library-image-card img {
  width: 100%;
  height: 150px;
  object-fit: cover;
}

.image-prompt {
  padding: 8px;
  font-size: 11px;
  color: var(--text-secondary);
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: var(--text-secondary);
}

.loading-icon {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel {
  padding: 8px 20px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel:hover {
  background: var(--bg-hover);
}

.btn-primary {
  padding: 8px 20px;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-md);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>