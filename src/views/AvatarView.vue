<template>
  <div class="avatar-view-container">
    <!-- 헤더 영역 -->
    <div class="avatar-header">
      <h2>아바타 스튜디오</h2>
      <p class="header-subtitle">나만의 AI 아바타로 비디오를 만들어보세요</p>
    </div>

    <!-- 메인 액션 카드 -->
    <div class="main-actions">
      <!-- Photo Avatar 생성 카드 (우선순위 1) -->
      <div class="action-card primary-card">
        <div class="card-icon">
          <Camera :size="48" />
        </div>
        <h3>나만의 아바타 만들기</h3>
        <p>내 사진으로 나를 닮은 AI 아바타를 생성합니다</p>
        <button v-if="canEdit" @click="openPhotoAvatarModal" class="btn-primary-action">
          <Plus :size="20" />
          Photo Avatar 생성
        </button>
      </div>

      <!-- 기본 아바타로 시작 카드 (우선순위 2) -->
      <div class="action-card secondary-card">
        <div class="card-icon">
          <Users :size="48" />
        </div>
        <h3>기본 아바타로 시작</h3>
        <p>카이로스가 선별한 프로 아바타를 바로 사용하세요</p>
        <button v-if="canEdit" @click="showDefaultAvatars = true" class="btn-secondary-action">
          <Grid :size="20" />
          아바타 둘러보기
        </button>
      </div>
    </div>

    <!-- 내 아바타 섹션 -->
    <div v-if="myAvatars.length > 0" class="my-avatars-section">
      <div class="section-header">
        <h3>내 아바타</h3>
        <span class="avatar-count">{{ myAvatars.length }}개</span>
      </div>
      
      <div class="avatar-grid">
        <div v-for="avatar in myAvatars" :key="avatar.id" class="avatar-card my-avatar">
          <div class="avatar-preview">
            <img v-if="avatar.thumbnail_url || avatar.photo_url || avatar.preview_image" 
                 :src="avatar.thumbnail_url || avatar.photo_url || avatar.preview_image" 
                 :alt="avatar.name">
            <div v-else class="avatar-placeholder">
              <User :size="48" />
            </div>
            <!-- 상태 배지 -->
            <div v-if="avatar.status || avatar.train_status" :class="`status-badge status-${avatar.status || avatar.train_status}`">
              {{ getStatusLabel(avatar.status || avatar.train_status) }}
            </div>
          </div>
          
          <div class="avatar-info">
            <h4>{{ avatar.name }}</h4>
            <p class="avatar-date">{{ formatDate(avatar.created_at) }}</p>
          </div>
          
          <div class="avatar-actions">
            <button 
              v-if="canEdit"
              @click="createVideoWithAvatar(avatar)" 
              class="btn-use-avatar"
              :disabled="!isAvatarReady(avatar)"
            >
              <Video :size="16" />
              비디오 만들기
            </button>
            <button v-if="canEdit" @click="deleteAvatar(avatar)" class="btn-icon delete">
              <Trash2 :size="16" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 기본 아바타 갤러리 (모달 형태) -->
    <div v-if="showDefaultAvatars" class="default-avatars-modal">
      <div class="modal-overlay" @click="showDefaultAvatars = false"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>카이로스 기본 아바타</h3>
          <button @click="showDefaultAvatars = false" class="btn-close">
            <X :size="24" />
          </button>
        </div>

        <!-- 카테고리 탭 -->
        <div class="category-tabs">
          <button 
            v-for="(category, key) in avatarCategories" 
            :key="key"
            @click="selectedCategory = key"
            :class="['category-tab', { active: selectedCategory === key }]"
          >
            {{ category.name }}
          </button>
        </div>

        <!-- 아바타 그리드 -->
        <div class="default-avatars-grid">
          <div 
            v-for="avatar in filteredDefaultAvatars" 
            :key="avatar.id"
            @click="selectDefaultAvatar(avatar)"
            :class="['default-avatar-card', { selected: selectedDefaultAvatar?.id === avatar.id }]"
          >
            <div class="avatar-thumbnail">
              <img v-if="!avatar.isPlaceholder" :src="avatar.thumbnail" :alt="avatar.name">
              <div v-else class="placeholder-icon">
                <Plus :size="32" />
              </div>
            </div>
            <div class="avatar-label">
              <h5>{{ avatar.name }}</h5>
              <p>{{ avatar.description }}</p>
            </div>
          </div>
        </div>

        <!-- 액션 버튼 -->
        <div class="modal-actions">
          <button @click="showDefaultAvatars = false" class="btn-cancel">취소</button>
          <button 
            v-if="canEdit"
            @click="useSelectedDefaultAvatar" 
            :disabled="!selectedDefaultAvatar || selectedDefaultAvatar.isPlaceholder"
            class="btn-confirm"
          >
            선택한 아바타로 비디오 만들기
          </button>
        </div>
      </div>
    </div>

    <!-- Photo Avatar 생성 모달 -->
    <PhotoAvatarWorkflowModal
      v-if="showPhotoAvatarModal"
      :project-id="projectId"
      @close="closePhotoAvatarModal"
      @avatar-created="onPhotoAvatarCreated"
    />

    <!-- 아바타 비디오 생성 모달 -->
    <AvatarVideoGenerationModal 
      v-if="showVideoModal"
      :project-id="projectId"
      :default-avatar-id="currentAvatarId"
      :is-photo-avatar="currentAvatarIsPhoto"
      @close="closeVideoModal"
      @generated="onVideoGenerated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Camera, Users, Plus, Grid, User, Video, Trash2, X } from 'lucide-vue-next'
import PhotoAvatarWorkflowModal from '@/components/generation/PhotoAvatarWorkflowModal.vue'
import AvatarVideoGenerationModal from '@/components/generation/AvatarVideoGenerationModal.vue'
import { kairosDefaultAvatars, avatarCategories, filterAvatarsByCategory } from '@/utils/kairosAvatars'
import { supabase } from '@/utils/supabase'

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

// 상태 관리
const myAvatars = ref([])
const photoAvatarGroups = ref([])
const loading = ref(false)
const showPhotoAvatarModal = ref(false)
const showVideoModal = ref(false)
const showDefaultAvatars = ref(false)
const selectedCategory = ref('business')
const selectedDefaultAvatar = ref(null)
const currentAvatarId = ref(null)
const currentAvatarIsPhoto = ref(false)

// 필터링된 기본 아바타
const filteredDefaultAvatars = computed(() => {
  return filterAvatarsByCategory(selectedCategory.value)
})

// HeyGen Photo Avatar Groups 로드
const loadPhotoAvatarGroups = async () => {
  try {
    const response = await fetch('/.netlify/functions/getHeyGenAvatarGroups?include_public=false')
    const data = await response.json()
    
    if (data.success && data.avatar_groups) {
      photoAvatarGroups.value = data.avatar_groups
      console.log('Loaded photo avatar groups:', data.avatar_groups)
    }
  } catch (error) {
    console.error('Failed to load photo avatar groups:', error)
  }
}

// 내 아바타 로드
const loadMyAvatars = async () => {
  loading.value = true
  try {
    // HeyGen Photo Avatar Groups 로드
    await loadPhotoAvatarGroups()
    
    // Photo Avatars 로드
    const { data: photoAvatars, error: photoError } = await supabase
      .from('photo_avatars')
      .select('*')
      .eq('project_id', props.projectId)
      .order('created_at', { ascending: false })

    if (photoError) throw photoError

    // HeyGen 커스텀 아바타 로드 (있는 경우)
    const { data: customAvatars, error: customError } = await supabase
      .from('gen_heygen_videos')
      .select('*')
      .eq('project_id', props.projectId)
      .eq('avatar_style', 'custom')
      .order('created_at', { ascending: false })

    if (customError && customError.code !== 'PGRST116') {
      console.error('Custom avatars load error:', customError)
    }

    // 데이터 통합 (Photo Avatar Groups 포함)
    myAvatars.value = [
      // HeyGen Photo Avatar Groups를 우선 표시
      ...photoAvatarGroups.value.map(group => ({
        id: group.id,
        name: group.name,
        thumbnail_url: group.preview_image,
        type: 'photo_avatar_group',
        group_type: group.group_type,
        num_looks: group.num_looks,
        default_voice_id: group.default_voice_id,
        train_status: group.train_status,
        created_at: new Date(group.created_at * 1000).toISOString()
      })),
      // 기존 DB의 Photo Avatars
      ...(photoAvatars || []).map(a => ({
        ...a,
        type: 'photo_avatar'
      })),
      // 기존 커스텀 아바타
      ...(customAvatars || []).map(a => ({
        ...a,
        type: 'custom_avatar'
      }))
    ]
  } catch (error) {
    console.error('Failed to load avatars:', error)
    showToast('아바타를 불러오는 데 실패했습니다', 'error')
  } finally {
    loading.value = false
  }
}

// 상태 라벨 변환
const getStatusLabel = (status) => {
  const statusMap = {
    'processing': '생성 중',
    'completed': '완료',
    'failed': '실패',
    'pending': '대기 중',
    'ready': '완료'
  }
  return statusMap[status] || status
}

// 아바타 사용 가능 여부 체크
const isAvatarReady = (avatar) => {
  // Photo Avatar Group인 경우
  if (avatar.type === 'photo_avatar_group') {
    return avatar.train_status === 'ready'
  }
  
  // 일반 아바타인 경우
  return avatar.status === 'completed' || !avatar.status // status가 없으면 사용 가능한 것으로 간주
}

// 날짜 포맷
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('ko-KR', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  })
}

// Photo Avatar 모달 관리
const openPhotoAvatarModal = () => {
  showPhotoAvatarModal.value = true
}

const closePhotoAvatarModal = () => {
  showPhotoAvatarModal.value = false
}

const onPhotoAvatarCreated = (avatar) => {
  loadMyAvatars()
  showToast('Photo Avatar가 생성되었습니다', 'success')
}

// 비디오 생성 모달 관리
const createVideoWithAvatar = (avatar) => {
  // Photo Avatar Group인 경우 Group ID를 직접 talking_photo_id로 사용
  if (avatar.type === 'photo_avatar_group') {
    console.log('Using Photo Avatar Group ID directly:', avatar.id)
    currentAvatarId.value = avatar.id  // Group ID를 직접 사용
    currentAvatarIsPhoto.value = true
  } else {
    currentAvatarId.value = avatar.avatar_id || avatar.id
    currentAvatarIsPhoto.value = false
  }
  
  showVideoModal.value = true
}

const closeVideoModal = () => {
  showVideoModal.value = false
  currentAvatarId.value = null
  currentAvatarIsPhoto.value = false
}

const onVideoGenerated = () => {
  showToast('비디오 생성이 시작되었습니다', 'success')
}

// 기본 아바타 선택
const selectDefaultAvatar = (avatar) => {
  if (avatar.isPlaceholder) {
    showDefaultAvatars.value = false
    openPhotoAvatarModal()
  } else {
    selectedDefaultAvatar.value = avatar
  }
}

const useSelectedDefaultAvatar = () => {
  if (selectedDefaultAvatar.value) {
    currentAvatarId.value = selectedDefaultAvatar.value.id
    showDefaultAvatars.value = false
    showVideoModal.value = true
  }
}

// 아바타 삭제
const deleteAvatar = async (avatar) => {
  if (!confirm('이 아바타를 삭제하시겠습니까?')) return

  try {
    const table = avatar.type === 'photo_avatar' ? 'photo_avatars' : 'gen_heygen_videos'
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('id', avatar.id)

    if (error) throw error

    showToast('아바타가 삭제되었습니다', 'success')
    await loadMyAvatars()
  } catch (error) {
    console.error('Failed to delete avatar:', error)
    showToast('아바타 삭제에 실패했습니다', 'error')
  }
}

// 토스트 메시지 (임시)
const showToast = (message, type = 'info') => {
  console.log(`[${type.toUpperCase()}]`, message)
}

// 컴포넌트 마운트 시 내 아바타 로드
onMounted(() => {
  loadMyAvatars()
})
</script>

<style scoped>
.avatar-view-container {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
}

.avatar-header {
  margin-bottom: 32px;
}

.avatar-header h2 {
  font-size: 28px;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.header-subtitle {
  font-size: 16px;
  color: #666;
}

/* 메인 액션 카드 */
.main-actions {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.action-card {
  background: white;
  border-radius: 16px;
  padding: 32px;
  text-align: center;
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.primary-card {
  border: 2px solid #667eea;
  background: linear-gradient(135deg, rgba(102, 126, 234, 0.05) 0%, rgba(118, 75, 162, 0.05) 100%);
}

.secondary-card {
  border: 1px solid #e0e0e0;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
}

.card-icon {
  width: 80px;
  height: 80px;
  margin: 0 auto 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.secondary-card .card-icon {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.action-card h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 8px;
}

.action-card p {
  font-size: 14px;
  color: #666;
  margin-bottom: 20px;
  line-height: 1.5;
}

.btn-primary-action,
.btn-secondary-action {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary-action {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-primary-action:hover {
  transform: scale(1.05);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-secondary-action {
  background: white;
  color: #667eea;
  border: 2px solid #667eea;
}

.btn-secondary-action:hover {
  background: #667eea;
  color: white;
}

/* 내 아바타 섹션 */
.my-avatars-section {
  margin-bottom: 48px;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.section-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.avatar-count {
  background: #f0f0f0;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  color: #666;
}

/* 아바타 그리드 */
.avatar-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}

.avatar-card {
  background: white;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
}

.avatar-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.my-avatar {
  border: 2px solid transparent;
}

.my-avatar:hover {
  border-color: #667eea;
}

.avatar-preview {
  width: 100%;
  height: 200px;
  background: #f5f5f5;
  position: relative;
  overflow: hidden;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #999;
  background: linear-gradient(135deg, #f5f5f5 0%, #e0e0e0 100%);
}

.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  backdrop-filter: blur(10px);
}

.status-processing {
  background: rgba(255, 193, 7, 0.9);
  color: white;
}

.status-completed,
.status-ready {
  background: rgba(76, 175, 80, 0.9);
  color: white;
}

.status-failed {
  background: rgba(244, 67, 54, 0.9);
  color: white;
}

.avatar-info {
  padding: 16px;
}

.avatar-info h4 {
  font-size: 16px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.avatar-date {
  font-size: 13px;
  color: #999;
}

.avatar-actions {
  padding: 0 16px 16px;
  display: flex;
  gap: 8px;
}

.btn-use-avatar {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-use-avatar:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
}

.btn-use-avatar:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-icon {
  width: 36px;
  height: 36px;
  border: none;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-icon.delete {
  background: #ffebee;
  color: #c62828;
}

.btn-icon.delete:hover {
  background: #ffcdd2;
}

/* 기본 아바타 모달 */
.default-avatars-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 900px;
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid #e0e0e0;
}

.modal-header h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1a1a1a;
}

.btn-close {
  width: 36px;
  height: 36px;
  border: none;
  background: none;
  cursor: pointer;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  transition: background 0.2s ease;
}

.btn-close:hover {
  background: #f0f0f0;
}

/* 카테고리 탭 */
.category-tabs {
  display: flex;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid #e0e0e0;
  overflow-x: auto;
}

.category-tab {
  padding: 8px 16px;
  border: none;
  background: none;
  color: #666;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.2s ease;
  white-space: nowrap;
}

.category-tab:hover {
  background: #f0f0f0;
}

.category-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

/* 기본 아바타 그리드 */
.default-avatars-grid {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 16px;
}

.default-avatar-card {
  cursor: pointer;
  border-radius: 12px;
  overflow: hidden;
  border: 2px solid transparent;
  transition: all 0.2s ease;
}

.default-avatar-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.default-avatar-card.selected {
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
}

.avatar-thumbnail {
  width: 100%;
  aspect-ratio: 1;
  background: #f5f5f5;
  position: relative;
}

.avatar-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-icon {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 100%);
  color: #999;
}

.avatar-label {
  padding: 12px;
  background: white;
}

.avatar-label h5 {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 4px;
}

.avatar-label p {
  font-size: 12px;
  color: #999;
  line-height: 1.3;
}

/* 모달 액션 */
.modal-actions {
  display: flex;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid #e0e0e0;
  background: #f9f9f9;
}

.btn-cancel,
.btn-confirm {
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-cancel {
  background: white;
  color: #666;
  border: 1px solid #e0e0e0;
}

.btn-cancel:hover {
  background: #f0f0f0;
}

.btn-confirm {
  flex: 1;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-confirm:hover:not(:disabled) {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 반응형 디자인 */
@media (max-width: 768px) {
  .avatar-view-container {
    padding: 16px;
  }

  .main-actions {
    grid-template-columns: 1fr;
  }

  .avatar-grid {
    grid-template-columns: 1fr;
  }

  .default-avatars-grid {
    grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  }

  .modal-content {
    width: 95%;
    max-height: 90vh;
  }
}
</style>