<template>
  <Teleport to="body">
    <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
      <div class="modal-content">
        <div class="modal-header">
          <h2>새 프로젝트 만들기</h2>
          <button @click="$emit('close')" class="close-button">×</button>
        </div>

        <form @submit.prevent="handleSubmit" class="modal-form">
          <div class="form-group">
            <label for="projectName">프로젝트 이름 *</label>
            <input
              id="projectName"
              v-model="formData.name"
              type="text"
              placeholder="프로젝트 이름을 입력하세요"
              required
              maxlength="255"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="projectDescription">설명</label>
            <textarea
              id="projectDescription"
              v-model="formData.description"
              placeholder="프로젝트에 대한 간단한 설명을 입력하세요 (선택사항)"
              rows="3"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="projectContent">초기 콘텐츠</label>
            <textarea
              id="projectContent"
              v-model="formData.content"
              placeholder="스크립트나 텍스트를 입력하세요 (나중에 추가할 수 있습니다)"
              rows="5"
              class="form-input"
            />
          </div>

          <div class="form-group">
            <label for="projectTags">태그</label>
            <input
              id="projectTags"
              v-model="tagsInput"
              type="text"
              placeholder="태그를 쉼표로 구분하여 입력하세요 (예: AI, 비디오, 튜토리얼)"
              class="form-input"
            />
          </div>

          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input
                v-model="formData.is_public"
                type="checkbox"
              />
              <span>공개 프로젝트로 설정</span>
            </label>
          </div>

          <div v-if="error" class="error-message">
            {{ error }}
          </div>

          <div class="modal-actions">
            <button type="button" @click="$emit('close')" class="btn-cancel">
              취소
            </button>
            <button type="submit" class="btn-submit" :disabled="loading || !formData.name">
              {{ loading ? '생성 중...' : '프로젝트 생성' }}
            </button>
          </div>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { useProjectsStore } from '@/stores/projects'
import { useRouter } from 'vue-router'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'created'])

const projectsStore = useProjectsStore()
const router = useRouter()

const loading = ref(false)
const error = ref('')

const formData = reactive({
  name: '',
  description: '',
  content: '',
  is_public: false
})

const tagsInput = ref('')

const handleSubmit = async () => {
  loading.value = true
  error.value = ''

  try {
    // 태그 처리
    const tags = tagsInput.value
      ? tagsInput.value.split(',').map(tag => tag.trim()).filter(tag => tag)
      : []

    const projectData = {
      ...formData,
      tags,
      status: 'draft'
    }

    const result = await projectsStore.createProject(projectData)

    if (result.success) {
      emit('created', result.data)
      emit('close')
      
      // 생성된 프로젝트로 이동 (선택사항)
      // router.push(`/projects/${result.data.id}`)
      
      // 폼 초기화
      formData.name = ''
      formData.description = ''
      formData.content = ''
      formData.is_public = false
      tagsInput.value = ''
    } else {
      error.value = result.error
    }
  } catch (err) {
    error.value = '프로젝트 생성 중 오류가 발생했습니다.'
    console.error(err)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 10px;
  width: 100%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  border-radius: 10px 10px 0 0;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5rem;
  color: var(--text-primary);
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--text-light);
  cursor: pointer;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  transition: color 0.3s;
}

.close-button:hover {
  color: var(--text-primary);
}

.modal-form {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: 500;
  color: var(--text-primary);
}

.form-input {
  width: 100%;
  padding: 10px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  font-size: 1rem;
  font-family: inherit;
  transition: border-color 0.3s;
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2);
}

.dark .form-input {
  background-color: var(--bg-secondary);
}

textarea.form-input {
  resize: vertical;
  min-height: 60px;
}

.checkbox-group {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  cursor: pointer;
  color: var(--text-primary);
}

.checkbox-label input[type="checkbox"] {
  margin-right: 8px;
}

.error-message {
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  font-size: 0.9rem;
  border: 1px solid var(--danger-color);
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
}

.btn-cancel, .btn-submit {
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  color: var(--text-primary);
}

.btn-cancel:hover {
  background: var(--bg-secondary);
}

.btn-submit {
  background: var(--primary-gradient);
  color: white;
  border: none;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .modal-content {
    max-width: 100%;
    margin: 10px;
  }

  .modal-form {
    padding: 15px;
  }
}</style>