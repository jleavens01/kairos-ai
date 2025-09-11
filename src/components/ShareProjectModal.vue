<template>
  <div v-if="show" class="modal-overlay" @click="$emit('close')">
    <div class="modal-content" @click.stop>
      <div class="modal-header">
        <h2>프로젝트 공유</h2>
        <button @click="$emit('close')" class="close-button">&times;</button>
      </div>

      <div class="modal-body">
        <div class="form-group">
          <label for="shareEmail">공유할 사용자 이메일</label>
          <input
            id="shareEmail"
            v-model="shareEmail"
            type="email"
            placeholder="사용자의 이메일을 입력하세요"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label>권한 설정</label>
          <div class="permission-options">
            <label class="radio-option">
              <input
                v-model="permission"
                type="radio"
                value="editor"
                name="permission"
              />
              <span class="radio-label">
                <strong>편집자</strong>
                <small>프로젝트를 보고 편집할 수 있습니다</small>
              </span>
            </label>
            <label class="radio-option">
              <input
                v-model="permission"
                type="radio"
                value="viewer"
                name="permission"
              />
              <span class="radio-label">
                <strong>뷰어</strong>
                <small>프로젝트를 볼 수만 있습니다</small>
              </span>
            </label>
          </div>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>
      </div>

      <div class="modal-footer">
        <button @click="$emit('close')" class="cancel-button">
          취소
        </button>
        <button @click="handleShare" class="share-button" :disabled="!shareEmail.trim()">
          공유하기
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({
  show: Boolean,
  projectId: String
});

const emit = defineEmits(['close', 'share']);

const shareEmail = ref('');
const permission = ref('editor');
const error = ref('');

// 모달이 열릴 때 초기화
watch(() => props.show, (newValue) => {
  if (newValue) {
    shareEmail.value = '';
    permission.value = 'editor';
    error.value = '';
  }
});

const handleShare = () => {
  if (!shareEmail.value.trim()) {
    error.value = '이메일을 입력해주세요.';
    return;
  }

  if (!isValidEmail(shareEmail.value)) {
    error.value = '올바른 이메일 형식을 입력해주세요.';
    return;
  }

  emit('share', {
    projectId: props.projectId,
    email: shareEmail.value.trim(),
    permission: permission.value
  });
};

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 10px;
  box-shadow: var(--shadow-lg);
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 1.5rem;
  font-weight: 600;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  color: var(--text-light);
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-button:hover {
  color: var(--text-primary);
}

.modal-body {
  padding: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  color: var(--text-primary);
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid var(--border-color);
  border-radius: 5px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  font-size: 1rem;
}

.form-input:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.2);
}

.permission-options {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.radio-option {
  display: flex;
  align-items: flex-start;
  cursor: pointer;
  padding: 15px;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  transition: all 0.3s;
}

.radio-option:hover {
  border-color: var(--primary-color);
  background-color: rgba(74, 222, 128, 0.05);
}

.radio-option input[type="radio"] {
  margin-right: 12px;
  margin-top: 2px;
}

.radio-label {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.radio-label strong {
  color: var(--text-primary);
  font-size: 1rem;
}

.radio-label small {
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.error-message {
  color: var(--danger-color);
  font-size: 0.9rem;
  margin-top: 10px;
  padding: 8px;
  background-color: rgba(239, 68, 68, 0.1);
  border-radius: 5px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  padding: 20px;
  border-top: 1px solid var(--border-color);
}

.cancel-button {
  padding: 10px 20px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.cancel-button:hover {
  background-color: var(--text-light);
  color: white;
}

.share-button {
  padding: 10px 20px;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: all 0.3s;
}

.share-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.share-button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>