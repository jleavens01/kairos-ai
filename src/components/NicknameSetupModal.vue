<template>
  <div v-if="show" class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <h2>닉네임 설정</h2>
      <p class="description">다른 사용자가 당신을 찾을 수 있는 고유한 닉네임을 설정하세요</p>
      
      <form @submit.prevent="handleSubmit">
        <div class="form-group">
          <label for="nickname">닉네임</label>
          <div class="input-wrapper">
            <span class="prefix">@</span>
            <input
              id="nickname"
              v-model="nickname"
              type="text"
              placeholder="my_nickname"
              maxlength="20"
              @input="checkAvailability"
              :class="{ 'error': nicknameError, 'success': nicknameAvailable }"
            />
          </div>
          <div class="input-hint">
            <span>3-20자, 영문, 숫자, 언더스코어(_)만 사용 가능</span>
            <span class="char-count">{{ nickname.length }}/20</span>
          </div>
          <div v-if="nicknameError" class="error-message">{{ nicknameError }}</div>
          <div v-if="nicknameAvailable" class="success-message">사용 가능한 닉네임입니다!</div>
        </div>
        
        <div class="modal-actions">
          <button type="button" @click="$emit('close')" class="btn-cancel">
            나중에 설정
          </button>
          <button 
            type="submit" 
            class="btn-submit" 
            :disabled="!canSubmit || loading"
          >
            {{ loading ? '설정 중...' : '닉네임 설정' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useProfileStore } from '@/stores/profile'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'success'])

const profileStore = useProfileStore()

const nickname = ref('')
const nicknameError = ref('')
const nicknameAvailable = ref(false)
const loading = ref(false)
let checkTimeout = null

// 닉네임 유효성 검사
const validateNickname = (value) => {
  if (value.length < 3) {
    return '닉네임은 최소 3자 이상이어야 합니다'
  }
  if (value.length > 20) {
    return '닉네임은 최대 20자까지 가능합니다'
  }
  if (!/^[a-zA-Z0-9_]+$/.test(value)) {
    return '영문, 숫자, 언더스코어(_)만 사용 가능합니다'
  }
  return null
}

// 닉네임 중복 확인
const checkAvailability = () => {
  clearTimeout(checkTimeout)
  nicknameError.value = ''
  nicknameAvailable.value = false
  
  if (!nickname.value) return
  
  const error = validateNickname(nickname.value)
  if (error) {
    nicknameError.value = error
    return
  }
  
  // 디바운싱
  checkTimeout = setTimeout(async () => {
    const { available } = await profileStore.checkNicknameAvailability(nickname.value)
    if (available) {
      nicknameAvailable.value = true
    } else {
      nicknameError.value = '이미 사용 중인 닉네임입니다'
    }
  }, 500)
}

const canSubmit = computed(() => {
  return nickname.value.length >= 3 && 
         nicknameAvailable.value && 
         !nicknameError.value
})

const handleSubmit = async () => {
  if (!canSubmit.value) return
  
  loading.value = true
  const result = await profileStore.updateNickname(nickname.value)
  loading.value = false
  
  if (result.success) {
    emit('success')
    emit('close')
  } else {
    nicknameError.value = result.error
  }
}

// 모달이 열릴 때 초기화
watch(() => props.show, (newVal) => {
  if (newVal) {
    nickname.value = ''
    nicknameError.value = ''
    nicknameAvailable.value = false
  }
})
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
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 10px;
  padding: 30px;
  max-width: 450px;
  width: 90%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
}

h2 {
  margin: 0 0 10px 0;
  color: var(--text-primary);
}

.description {
  color: var(--text-secondary);
  margin-bottom: 25px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  font-weight: 500;
  color: var(--text-primary);
}

.input-wrapper {
  display: flex;
  align-items: center;
  border: 2px solid var(--border-color);
  border-radius: 5px;
  overflow: hidden;
  transition: border-color 0.3s;
  background-color: var(--bg-primary);
}

.input-wrapper:focus-within {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2);
}

.prefix {
  padding: 0 12px;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  font-weight: 500;
}

input {
  flex: 1;
  padding: 10px 12px;
  border: none;
  outline: none;
  font-size: 1rem;
  background: transparent;
  color: var(--text-primary);
}

input.error {
  color: var(--danger-color);
}

input.success {
  color: var(--success-color);
}

.input-hint {
  display: flex;
  justify-content: space-between;
  margin-top: 5px;
  font-size: 0.85rem;
  color: var(--text-secondary);
}

.char-count {
  color: var(--text-light);
}

.error-message {
  color: var(--danger-color);
  font-size: 0.85rem;
  margin-top: 5px;
}

.success-message {
  color: var(--success-color);
  font-size: 0.85rem;
  margin-top: 5px;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 25px;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-cancel {
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background-color: var(--bg-primary);
  color: var(--text-primary);
}

.btn-submit {
  background: var(--primary-gradient);
  color: white;
}

.btn-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>