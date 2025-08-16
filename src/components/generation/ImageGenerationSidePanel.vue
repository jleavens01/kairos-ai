<template>
  <div class="side-panel">
    <div class="panel-header">
      <h4>{{ panelTitle }}</h4>
      <button @click="$emit('close')" class="btn-close-panel">
        <X :size="18" />
      </button>
    </div>

    <div class="panel-content">
      <!-- 디버그: 현재 카테고리 = {{ category }} -->
      
      <!-- 캐릭터 카테고리 -->
      <div v-if="category === 'character'" class="character-panel">
        <div class="section section-scrollable">
          <h5>스토리보드 캐릭터</h5>
          <div class="scrollable-content">
            <div v-if="characterSuggestions.length === 0" class="empty-state">
              스토리보드에 등록된 캐릭터가 없습니다.
            </div>
            <div v-else class="suggestion-list">
              <div 
                v-for="character in characterSuggestions" 
                :key="character"
                class="suggestion-item"
                @click="$emit('select-character', { name: character })"
              >
                {{ character }}
              </div>
            </div>
          </div>
        </div>

        <div class="section section-scrollable">
          <h5>생성된 캐릭터</h5>
          <div class="scrollable-content">
            <div v-if="loadingCharacters" class="loading">
              로딩 중...
            </div>
            <div v-else-if="generatedCharacters.length === 0" class="empty-state">
              아직 생성된 캐릭터가 없습니다
            </div>
            <div v-else class="character-list">
              <div 
                v-for="character in generatedCharacters" 
                :key="character.id"
                class="character-item"
                @click="$emit('select-character', character)"
              >
                <img 
                  v-if="character.image_url" 
                  :src="character.image_url" 
                  :alt="character.name"
                  class="character-thumb"
                />
                <div v-else class="character-thumb-placeholder">
                  <User :size="20" />
                </div>
                <span class="character-name">{{ character.name }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 씬 카테고리 -->
      <div v-else-if="category === 'scene'" class="scene-panel">
        <div class="section">
          <h5>씬 리스트</h5>
          <div v-if="allScenes.length === 0" class="empty-state">
            <p>씬 정보를 불러오는 중...</p>
          </div>
          <div v-else class="scene-full-list">
            <div 
              v-for="scene in allScenes" 
              :key="scene.id"
              class="scene-item-card"
              :class="{ active: scene.id === selectedScene?.id }"
              @click="$emit('select-scene', scene)"
            >
              <!-- 씬 번호와 등장인물 (한 줄) -->
              <div class="scene-item-header">
                <span class="scene-number-badge">씬 {{ scene.scene_number }}</span>
                <div v-if="scene.characters && scene.characters.length > 0" class="scene-chars-inline">
                  <span class="chars-list">{{ scene.characters.slice(0, 3).join(', ') }}</span>
                  <span v-if="scene.characters.length > 3" class="chars-more">+{{ scene.characters.length - 3 }}</span>
                </div>
              </div>
              
              <!-- 스크립트 텍스트 -->
              <div class="scene-item-text">
                {{ truncateText(scene.original_text || scene.original_script_text || '스크립트 없음', 80) }}
              </div>
              
              <!-- 썸네일 이미지 (전체 너비) -->
              <div v-if="sceneImageMap[scene.id]" class="scene-item-thumbnail-full">
                <img :src="sceneImageMap[scene.id]" :alt="`Scene ${scene.scene_number}`" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 배경 카테고리 -->
      <div v-else-if="category === 'background'" class="background-panel">
        <div class="section">
          <h5>생성된 배경</h5>
          <div v-if="loadingBackgrounds" class="loading">
            로딩 중...
          </div>
          <div v-else-if="generatedBackgrounds.length === 0" class="empty-state">
            아직 생성된 배경이 없습니다
          </div>
          <div v-else class="background-grid">
            <div 
              v-for="bg in generatedBackgrounds" 
              :key="bg.id"
              class="background-item"
              @click="$emit('select-background', bg)"
            >
              <img :src="bg.image_url" :alt="bg.prompt" />
              <div class="background-info">
                {{ bg.prompt?.substring(0, 30) }}...
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 오브젝트 카테고리 -->
      <div v-else-if="category === 'object'" class="object-panel">
        <div class="section">
          <h5>생성된 오브젝트</h5>
          <div v-if="loadingObjects" class="loading">
            로딩 중...
          </div>
          <div v-else-if="generatedObjects.length === 0" class="empty-state">
            아직 생성된 오브젝트가 없습니다
          </div>
          <div v-else class="object-grid">
            <div 
              v-for="obj in generatedObjects" 
              :key="obj.id"
              class="object-item"
              @click="$emit('select-object', obj)"
            >
              <img :src="obj.image_url" :alt="obj.prompt" />
              <div class="object-info">
                {{ obj.prompt?.substring(0, 30) }}...
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- 기본 카테고리 (category가 없거나 일치하지 않을 때) -->
      <div v-if="!category || !['character', 'scene', 'background', 'object'].includes(category)" class="empty-state">
        <p>카테고리를 선택해주세요</p>
        <p class="hint">현재 카테고리: {{ category || '없음' }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { X, User } from 'lucide-vue-next'

const props = defineProps({
  category: {
    type: String,
    required: true
  },
  projectId: {
    type: String,
    required: true
  },
  selectedScene: {
    type: Object,
    default: null
  },
  allScenes: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits([
  'close',
  'apply-suggestion',
  'select-character',
  'select-scene',
  'select-background',
  'select-object',
  'view-image'
])

// 상태 관리
const generatedCharacters = ref([])
const generatedBackgrounds = ref([])
const generatedObjects = ref([])
const sceneImages = ref([])
const sceneImageMap = ref({}) // 씬별 대표 이미지 맵
const loadingCharacters = ref(false)
const loadingBackgrounds = ref(false)
const loadingObjects = ref(false)

// 스토리보드의 캐릭터 리스트
const characterSuggestions = ref([])
const storyboardCharacters = ref([])

const backgroundSuggestions = ref([
  '실내 - 거실',
  '실내 - 침실',
  '실외 - 거리',
  '실외 - 공원',
  '실외 - 건물 외관'
])

const objectSuggestions = ref([
  '책상 위 소품',
  '손에 든 물건',
  '배경 소품',
  '의상 액세서리',
  '특수 효과 요소'
])

// 계산된 속성
const panelTitle = computed(() => {
  const titles = {
    character: '캐릭터 관리',
    scene: '씬 정보',
    background: '배경 관리',
    object: '오브젝트 관리'
  }
  return titles[props.category] || '정보'
})

const nearbyScenes = computed(() => {
  if (!props.selectedScene || !props.allScenes.length) return []
  
  const currentIndex = props.allScenes.findIndex(s => s.id === props.selectedScene.id)
  const start = Math.max(0, currentIndex - 2)
  const end = Math.min(props.allScenes.length, currentIndex + 3)
  
  return props.allScenes.slice(start, end)
})

// 데이터 로드 함수들
const loadCharacters = async () => {
  loadingCharacters.value = true
  try {
    // 1. 스토리보드에서 캐릭터 리스트 가져오기
    const { data: sheetsData, error: sheetsError } = await supabase
      .from('production_sheets')
      .select('characters')
      .eq('project_id', props.projectId)
    
    const storyboardCharSet = new Set()
    if (!sheetsError && sheetsData) {
      // 모든 씬에서 캐릭터 추출 및 중복 제거
      sheetsData.forEach(sheet => {
        if (sheet.characters && Array.isArray(sheet.characters)) {
          sheet.characters.forEach(char => storyboardCharSet.add(char))
        }
      })
    }
    
    // 2. 생성된 캐릭터 이미지 가져오기
    const { data, error } = await supabase
      .from('gen_images')
      .select('*')
      .eq('project_id', props.projectId)
      .eq('image_type', 'character')
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(30)

    if (error) throw error
    
    // 캐릭터 이름별로 그룹화 (최신 이미지만)
    const characterMap = new Map()
    data?.forEach(img => {
      const charName = img.element_name
      if (charName && !characterMap.has(charName)) {
        characterMap.set(charName, {
          id: img.id,
          name: charName,
          image_url: img.image_url || img.storage_image_url || img.thumbnail_url
        })
      }
    })
    
    // 3. 생성된 캐릭터 이름 목록 생성
    const generatedCharsArray = Array.from(characterMap.values())
    const generatedCharNames = new Set(generatedCharsArray.map(char => char.name))
    
    // 4. 스토리보드 캐릭터 중 이미 생성된 것 제외
    const filteredStoryboardChars = Array.from(storyboardCharSet).filter(charName => 
      !generatedCharNames.has(charName)
    )
    
    // 5. 결과 설정
    storyboardCharacters.value = filteredStoryboardChars
    characterSuggestions.value = filteredStoryboardChars
    generatedCharacters.value = generatedCharsArray
  } catch (error) {
    console.error('캐릭터 로드 오류:', error)
  } finally {
    loadingCharacters.value = false
  }
}

const loadBackgrounds = async () => {
  loadingBackgrounds.value = true
  try {
    const { data, error } = await supabase
      .from('gen_images')
      .select('*')
      .eq('project_id', props.projectId)
      .eq('image_type', 'background')
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) throw error
    generatedBackgrounds.value = data || []
  } catch (error) {
    console.error('배경 로드 오류:', error)
  } finally {
    loadingBackgrounds.value = false
  }
}

const loadObjects = async () => {
  loadingObjects.value = true
  try {
    const { data, error } = await supabase
      .from('gen_images')
      .select('*')
      .eq('project_id', props.projectId)
      .eq('image_type', 'object')
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(12)

    if (error) throw error
    generatedObjects.value = data || []
  } catch (error) {
    console.error('오브젝트 로드 오류:', error)
  } finally {
    loadingObjects.value = false
  }
}

const loadSceneImages = async () => {
  try {
    // 모든 씬의 대표 이미지 로드 (최신 1개씩)
    const sceneIds = props.allScenes.map(scene => scene.id)
    if (sceneIds.length === 0) return
    
    const { data, error } = await supabase
      .from('gen_images')
      .select('*')
      .eq('project_id', props.projectId)
      .in('production_sheet_id', sceneIds)
      .eq('generation_status', 'completed')
      .order('created_at', { ascending: false })

    if (error) throw error
    
    // 씬별로 최신 이미지 1개씩 맵핑
    const imageMap = {}
    data?.forEach(img => {
      if (img.production_sheet_id && !imageMap[img.production_sheet_id]) {
        imageMap[img.production_sheet_id] = img.thumbnail_url || img.storage_image_url || img.image_url
      }
    })
    
    sceneImageMap.value = imageMap
    
    // 선택된 씬의 이미지도 업데이트
    if (props.selectedScene) {
      sceneImages.value = data?.filter(img => img.production_sheet_id === props.selectedScene.id) || []
    }
  } catch (error) {
    console.error('씬 이미지 로드 오류:', error)
  }
}

// 텍스트 자르기 함수
const truncateText = (text, maxLength) => {
  if (!text) return ''
  return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// 카테고리 변경 감지
watch(() => props.category, (newCategory) => {
  console.log('사이드 패널 카테고리 변경:', newCategory)
  if (newCategory === 'character') {
    loadCharacters()
  } else if (newCategory === 'background') {
    loadBackgrounds()
  } else if (newCategory === 'object') {
    loadObjects()
  } else if (newCategory === 'scene') {
    // scene 카테고리일 때 모든 씬 이미지 로드
    loadSceneImages()
  }
}, { immediate: true })

// 선택된 씬 변경 감지
watch(() => props.selectedScene, () => {
  if (props.category === 'scene' && props.selectedScene) {
    loadSceneImages()
  }
}, { immediate: true })

// allScenes 변경 감지 (씬 네비게이션 업데이트)
watch(() => props.allScenes, () => {
  // 씬 리스트가 업데이트되면 이미지도 다시 로드
  if (props.category === 'scene' && props.allScenes.length > 0) {
    loadSceneImages()
  }
}, { immediate: true })

onMounted(() => {
  // 초기 데이터 로드
})
</script>

<style scoped>
.side-panel {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border-color);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-primary);
}

.panel-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}

.btn-close-panel {
  background: none;
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

.btn-close-panel:hover {
  background: var(--bg-secondary);
  color: var(--text-primary);
}

.panel-content {
  flex: 1;
  overflow: hidden;
  padding: 20px;
  display: flex;
  flex-direction: column;
}

.section {
  margin-bottom: 24px;
}

.section h5 {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

/* 스크롤 가능한 섹션 */
.section-scrollable {
  display: flex;
  flex-direction: column;
  height: calc(50% - 12px); /* 패널 높이의 절반씩 */
  margin-bottom: 24px;
}

.section-scrollable h5 {
  flex-shrink: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0 0 12px 0;
}

.scrollable-content {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
}

/* 캐릭터 패널 레이아웃 */
.character-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

/* 배경/오브젝트 패널 */
.background-panel,
.object-panel {
  height: 100%;
  overflow-y: auto;
}

/* 씬 패널 */
.scene-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
}

/* 제안 리스트 */
.suggestion-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.suggestion-item {
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.suggestion-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
  transform: translateX(4px);
}

/* 캐릭터 리스트 */
.character-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.character-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.character-item:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.character-thumb,
.character-thumb-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-bottom: 8px;
  object-fit: cover;
}

.character-thumb-placeholder {
  background: var(--bg-tertiary);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
}

.character-name {
  font-size: 0.85rem;
  color: var(--text-primary);
  text-align: center;
}

/* 씬 패널 */
.current-scene {
  margin-bottom: 24px;
}

.scene-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-color);
}

.scene-number {
  padding: 4px 8px;
  background: var(--primary-color);
  color: white;
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: 600;
}

.scene-name {
  font-size: 1rem;
  color: var(--text-primary);
  font-weight: 500;
}

.script-content {
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-primary);
  max-height: 200px;
  overflow-y: auto;
}

/* 이미지 그리드 */
.image-grid,
.background-grid,
.object-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.image-item,
.background-item,
.object-item {
  position: relative;
  aspect-ratio: 1;
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  transition: all 0.2s;
}

.image-item:hover,
.background-item:hover,
.object-item:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.image-item img,
.background-item img,
.object-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.background-info,
.object-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 6px 8px;
  background: rgba(0, 0, 0, 0.7);
  color: white;
  font-size: 0.75rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 씬 네비게이션 */
.scene-navigation {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid var(--border-color);
}

.scene-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.scene-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.scene-nav-item:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
}

.scene-nav-item.active {
  background: rgba(var(--primary-rgb), 0.1);
  border-color: var(--primary-color);
}

.scene-nav-number {
  padding: 2px 6px;
  background: var(--bg-secondary);
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-secondary);
}

.scene-nav-item.active .scene-nav-number {
  background: var(--primary-color);
  color: white;
}

.scene-nav-title {
  font-size: 0.85rem;
  color: var(--text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* 씬 리스트 스타일 */
.scene-full-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  overflow-y: auto;
  padding-right: 4px;
  min-height: 0;
}

/* 씬 카드 */
.scene-item-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.scene-item-card:hover {
  background: var(--bg-tertiary);
  border-color: var(--primary-color);
  transform: translateX(2px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.scene-item-card.active {
  background: rgba(var(--primary-rgb), 0.1);
  border-color: var(--primary-color);
  box-shadow: 0 2px 8px rgba(var(--primary-rgb), 0.2);
}

/* 헤더 (씬 번호 + 등장인물) */
.scene-item-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.scene-number-badge {
  padding: 3px 8px;
  background: var(--primary-color);
  color: white;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
}

.scene-chars-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: var(--text-secondary);
  overflow: hidden;
}

.chars-list {
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.chars-more {
  color: var(--primary-color);
  font-weight: 500;
  white-space: nowrap;
}

/* 스크립트 텍스트 */
.scene-item-text {
  font-size: 0.9rem;
  color: var(--text-primary);
  line-height: 1.5;
  padding: 4px 0;
}

/* 썸네일 이미지 (전체 너비, 원본 비율 유지) */
.scene-item-thumbnail-full {
  width: 100%;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--border-color);
  margin-top: 4px;
  background: var(--bg-tertiary);
}

.scene-item-thumbnail-full img {
  width: 100%;
  height: auto;
  display: block;
  object-fit: contain;
  transition: transform 0.2s;
}

.scene-item-card:hover .scene-item-thumbnail-full img {
  transform: scale(1.02);
}

/* 로딩 및 빈 상태 */
.loading,
.empty-state {
  padding: 40px 20px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
</style>