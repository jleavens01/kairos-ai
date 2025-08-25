<template>
  <div v-if="show" class="modal-overlay" @click.self="close">
    <div class="modal-container">
      <div class="modal-header">
        <h3>프롬프트 프리셋 관리</h3>
        <button @click="close" class="btn-close"><X :size="20" /></button>
      </div>

      <div class="modal-body">
        <!-- 새 프리셋 추가 -->
        <div class="add-preset-section">
          <h4>새 프리셋 추가</h4>
          <div class="form-group">
            <input 
              v-model="newPresetName" 
              type="text"
              placeholder="프리셋 이름"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <textarea 
              v-model="newPresetPrompt" 
              placeholder="프롬프트 (예: cinematic style, dramatic lighting)"
              rows="3"
              class="form-textarea"
            ></textarea>
          </div>
          <div class="form-group inline-group">
            <div class="inline-item">
              <label>타입</label>
              <select v-model="newPresetType" class="form-select">
                <option value="general">일반</option>
                <option value="style">스타일</option>
                <option value="quality">품질</option>
                <option value="camera">카메라</option>
                <option value="lighting">조명</option>
              </select>
            </div>
            <div class="inline-item">
              <label>미디어</label>
              <select v-model="newPresetMediaType" class="form-select">
                <option value="image">이미지</option>
                <option value="video">비디오</option>
                <option value="both">모두</option>
              </select>
            </div>
          </div>
          <button 
            @click="addPreset" 
            class="btn-primary"
            :disabled="!newPresetName || !newPresetPrompt"
          >
            <Plus :size="16" /> 프리셋 추가
          </button>
        </div>

        <!-- 기존 프리셋 목록 -->
        <div class="presets-list-section">
          <h4>기존 프리셋</h4>
          <div v-if="presets.length === 0" class="no-presets">
            등록된 프리셋이 없습니다.
          </div>
          <div v-else class="presets-list">
            <div 
              v-for="preset in presets" 
              :key="preset.id"
              class="preset-item"
            >
              <div class="preset-info">
                <div class="preset-header-row">
                  <h5>{{ preset.name }}</h5>
                  <div class="preset-badges">
                    <span class="badge" :class="`badge-${preset.preset_type}`">
                      {{ getTypeLabel(preset.preset_type) }}
                    </span>
                    <span class="badge badge-media">
                      {{ getMediaLabel(preset.media_type) }}
                    </span>
                    <span v-if="preset.projects?.name && preset.project_id !== projectId" class="badge badge-project">
                      {{ preset.projects.name }}
                    </span>
                  </div>
                </div>
                <p class="preset-prompt">{{ preset.prompt }}</p>
              </div>
              <div class="preset-actions">
                <button 
                  @click="editPreset(preset)"
                  class="btn-icon"
                  title="수정"
                >
                  <Edit2 :size="16" />
                </button>
                <button 
                  @click="deletePreset(preset)"
                  class="btn-icon btn-delete"
                  title="삭제"
                >
                  <Trash2 :size="16" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 수정 모달 -->
    <div v-if="editingPreset" class="modal-overlay" @click.self="cancelEdit">
      <div class="modal-container modal-edit">
        <div class="modal-header">
          <h3>프리셋 수정</h3>
          <button @click="cancelEdit" class="btn-close"><X :size="20" /></button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>이름</label>
            <input 
              v-model="editingPreset.name" 
              type="text"
              class="form-input"
            />
          </div>
          <div class="form-group">
            <label>프롬프트</label>
            <textarea 
              v-model="editingPreset.prompt" 
              rows="3"
              class="form-textarea"
            ></textarea>
          </div>
          <div class="form-group inline-group">
            <div class="inline-item">
              <label>타입</label>
              <select v-model="editingPreset.preset_type" class="form-select">
                <option value="general">일반</option>
                <option value="style">스타일</option>
                <option value="quality">품질</option>
                <option value="camera">카메라</option>
                <option value="lighting">조명</option>
              </select>
            </div>
            <div class="inline-item">
              <label>미디어</label>
              <select v-model="editingPreset.media_type" class="form-select">
                <option value="image">이미지</option>
                <option value="video">비디오</option>
                <option value="both">모두</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button @click="cancelEdit" class="btn-secondary">취소</button>
            <button @click="updatePreset" class="btn-primary">수정 완료</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '@/utils/supabase'
import { X, Plus, Edit2, Trash2 } from 'lucide-vue-next'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  projectId: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    default: 'both' // image, video, both
  }
})

const emit = defineEmits(['close', 'saved'])

// State
const presets = ref([])
const newPresetName = ref('')
const newPresetPrompt = ref('')
const newPresetType = ref('general')
const newPresetMediaType = ref(props.mediaType === 'both' ? 'both' : props.mediaType)
const editingPreset = ref(null)

// Methods
const close = () => {
  emit('close')
}

const loadPresets = async () => {
  try {
    // 현재 사용자 가져오기
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      console.error('User not found')
      return
    }
    
    // 먼저 사용자의 모든 프로젝트 ID 가져오기
    const { data: userProjects, error: projectsError } = await supabase
      .from('projects')
      .select('id')
      .eq('user_id', user.id)
    
    if (projectsError) {
      console.error('프로젝트 조회 실패:', projectsError)
      return
    }
    
    const projectIds = userProjects?.map(p => p.id) || []
    
    if (projectIds.length === 0) {
      presets.value = []
      return
    }
    
    // 사용자의 모든 프로젝트에서 프리셋 가져오기 (프로젝트 정보 포함)
    let query = supabase
      .from('prompt_presets')
      .select('*, projects(name)')
      .in('project_id', projectIds)  // 사용자의 모든 프로젝트에서 프리셋 가져오기
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })
    
    // 미디어 타입 필터링
    if (props.mediaType !== 'both') {
      query = query.in('media_type', [props.mediaType, 'both'])
    }
    
    const { data, error } = await query
    
    if (error) throw error
    presets.value = data || []
  } catch (error) {
    console.error('프리셋 로드 실패:', error)
  }
}

const addPreset = async () => {
  if (!newPresetName.value || !newPresetPrompt.value) return
  
  try {
    const { error } = await supabase
      .from('prompt_presets')
      .insert({
        project_id: props.projectId,
        name: newPresetName.value,
        prompt: newPresetPrompt.value,
        preset_type: newPresetType.value,
        media_type: newPresetMediaType.value,
        is_active: true
      })
    
    if (error) throw error
    
    // 초기화
    newPresetName.value = ''
    newPresetPrompt.value = ''
    newPresetType.value = 'general'
    
    // 목록 새로고침
    await loadPresets()
    emit('saved')
    
    console.log('프리셋이 추가되었습니다.')
  } catch (error) {
    console.error('프리셋 추가 실패:', error)
    alert('프리셋 추가에 실패했습니다.')
  }
}

const editPreset = (preset) => {
  editingPreset.value = { ...preset }
}

const cancelEdit = () => {
  editingPreset.value = null
}

const updatePreset = async () => {
  if (!editingPreset.value) return
  
  try {
    const { error } = await supabase
      .from('prompt_presets')
      .update({
        name: editingPreset.value.name,
        prompt: editingPreset.value.prompt,
        preset_type: editingPreset.value.preset_type,
        media_type: editingPreset.value.media_type,
        updated_at: new Date().toISOString()
      })
      .eq('id', editingPreset.value.id)
    
    if (error) throw error
    
    editingPreset.value = null
    await loadPresets()
    emit('saved')
    
    console.log('프리셋이 수정되었습니다.')
  } catch (error) {
    console.error('프리셋 수정 실패:', error)
    alert('프리셋 수정에 실패했습니다.')
  }
}

const deletePreset = async (preset) => {
  if (!confirm(`"${preset.name}" 프리셋을 삭제하시겠습니까?`)) return
  
  try {
    const { error } = await supabase
      .from('prompt_presets')
      .delete()
      .eq('id', preset.id)
    
    if (error) throw error
    
    await loadPresets()
    emit('saved')
    
    console.log('프리셋이 삭제되었습니다.')
  } catch (error) {
    console.error('프리셋 삭제 실패:', error)
    alert('프리셋 삭제에 실패했습니다.')
  }
}

const getTypeLabel = (type) => {
  const labels = {
    general: '일반',
    style: '스타일',
    quality: '품질',
    camera: '카메라',
    lighting: '조명'
  }
  return labels[type] || type
}

const getMediaLabel = (type) => {
  const labels = {
    image: '이미지',
    video: '비디오',
    both: '모두'
  }
  return labels[type] || type
}

// Lifecycle
onMounted(() => {
  loadPresets()
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.modal-container {
  background: var(--bg-primary);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  max-height: 85vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
}

.modal-edit {
  max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
}

.btn-close {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}

/* 섹션 스타일 */
.add-preset-section,
.presets-list-section {
  margin-bottom: 24px;
}

.add-preset-section h4,
.presets-list-section h4 {
  margin-bottom: 16px;
  color: var(--text-primary);
  font-size: 1.1rem;
}

.add-preset-section {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 8px;
}

/* 폼 스타일 */
.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.form-input,
.form-textarea,
.form-select {
  width: 100%;
  padding: 10px;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  font-size: 0.95rem;
}

.form-textarea {
  resize: vertical;
  font-family: inherit;
}

.inline-group {
  display: flex;
  gap: 12px;
}

.inline-item {
  flex: 1;
}

/* 버튼 스타일 */
.btn-primary {
  padding: 10px 20px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 10px 20px;
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.95rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-tertiary);
}

/* 프리셋 목록 */
.presets-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preset-item {
  display: flex;
  justify-content: space-between;
  align-items: start;
  padding: 12px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.2s;
}

.preset-item:hover {
  border-color: var(--primary-color);
  background: var(--bg-tertiary);
}

.preset-info {
  flex: 1;
}

.preset-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.preset-info h5 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1rem;
}

.preset-badges {
  display: flex;
  gap: 6px;
}

.badge {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge-general {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.badge-style {
  background: rgba(168, 85, 247, 0.2);
  color: #a855f7;
}

.badge-quality {
  background: rgba(59, 130, 246, 0.2);
  color: #3b82f6;
}

.badge-camera {
  background: rgba(236, 72, 153, 0.2);
  color: #ec4899;
}

.badge-lighting {
  background: rgba(251, 191, 36, 0.2);
  color: #fbbf24;
}

.badge-media {
  background: var(--bg-tertiary);
  color: var(--text-secondary);
}

.badge-project {
  background: rgba(74, 222, 128, 0.2);
  color: var(--primary-color);
  border: 1px solid var(--primary-color);
}

.preset-prompt {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.85rem;
  line-height: 1.4;
}

.preset-actions {
  display: flex;
  gap: 8px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  padding: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: var(--bg-tertiary);
  color: var(--text-primary);
}

.btn-icon.btn-delete:hover {
  background: rgba(239, 68, 68, 0.2);
  color: #ef4444;
  border-color: #ef4444;
}

.no-presets {
  padding: 32px;
  text-align: center;
  color: var(--text-tertiary);
  font-style: italic;
}
</style>