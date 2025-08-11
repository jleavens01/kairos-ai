<template>
  <div class="signup-container">
    <div class="signup-card">
      <h1 class="signup-title">회원가입</h1>
      
      <form @submit.prevent="handleSignUp" class="signup-form">
        <div class="form-group">
          <label for="displayName">이름</label>
          <input
            id="displayName"
            v-model="displayName"
            type="text"
            placeholder="이름을 입력하세요"
            required
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="email">이메일</label>
          <input
            id="email"
            v-model="email"
            type="email"
            placeholder="이메일을 입력하세요"
            required
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="password">비밀번호</label>
          <input
            id="password"
            v-model="password"
            type="password"
            placeholder="비밀번호를 입력하세요 (6자 이상)"
            required
            minlength="6"
            class="form-input"
          />
        </div>

        <div class="form-group">
          <label for="passwordConfirm">비밀번호 확인</label>
          <input
            id="passwordConfirm"
            v-model="passwordConfirm"
            type="password"
            placeholder="비밀번호를 다시 입력하세요"
            required
            class="form-input"
          />
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <div v-if="successMessage" class="success-message">
          {{ successMessage }}
        </div>

        <button type="submit" class="submit-button" :disabled="loading">
          {{ loading ? '가입 중...' : '회원가입' }}
        </button>
      </form>

      <div class="divider">
        <span>또는</span>
      </div>

      <button @click="handleGoogleSignUp" class="google-button" :disabled="loading">
        <span class="google-icon">🔷</span>
        Google로 회원가입
      </button>

      <div class="login-link">
        이미 계정이 있으신가요?
        <router-link to="/login">로그인</router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useRouter } from 'vue-router';

const authStore = useAuthStore();
const router = useRouter();

const displayName = ref('');
const email = ref('');
const password = ref('');
const passwordConfirm = ref('');
const loading = ref(false);
const error = ref('');
const successMessage = ref('');

const handleSignUp = async () => {
  loading.value = true;
  error.value = '';
  successMessage.value = '';
  
  // 비밀번호 확인
  if (password.value !== passwordConfirm.value) {
    error.value = '비밀번호가 일치하지 않습니다.';
    loading.value = false;
    return;
  }
  
  // 비밀번호 길이 확인
  if (password.value.length < 6) {
    error.value = '비밀번호는 6자 이상이어야 합니다.';
    loading.value = false;
    return;
  }
  
  const result = await authStore.signUp(email.value, password.value, displayName.value);
  
  if (result.success) {
    successMessage.value = '회원가입이 완료되었습니다. 이메일을 확인해주세요.';
    setTimeout(() => {
      router.push('/login');
    }, 2000);
  } else {
    error.value = result.error;
  }
  
  loading.value = false;
};

const handleGoogleSignUp = async () => {
  loading.value = true;
  error.value = '';
  
  const result = await authStore.signInWithGoogle();
  
  if (!result.success) {
    error.value = result.error;
  }
  // Google OAuth는 리다이렉트 방식이므로 별도 라우팅 불필요
  
  loading.value = false;
};
</script>

<style scoped>
.signup-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 20px;
}

.signup-card {
  background: white;
  border-radius: 10px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
  padding: 40px;
  width: 100%;
  max-width: 400px;
}

.signup-title {
  font-size: 2rem;
  font-weight: 700;
  color: #2c3e50;
  text-align: center;
  margin-bottom: 30px;
}

.signup-form {
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  color: #495057;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 12px;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.1);
}

.error-message {
  background-color: #f8d7da;
  color: #721c24;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  font-size: 0.9rem;
}

.success-message {
  background-color: #d4edda;
  color: #155724;
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  font-size: 0.9rem;
}

.submit-button {
  width: 100%;
  padding: 12px;
  background-color: #667eea;
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.3s;
}

.submit-button:hover:not(:disabled) {
  background-color: #5a67d8;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.divider {
  text-align: center;
  margin: 20px 0;
  position: relative;
}

.divider span {
  background-color: white;
  padding: 0 10px;
  color: #6c757d;
  position: relative;
  z-index: 1;
}

.divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background-color: #dee2e6;
}

.google-button {
  width: 100%;
  padding: 12px;
  background-color: white;
  color: #495057;
  border: 1px solid #dee2e6;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.google-button:hover:not(:disabled) {
  background-color: #f8f9fa;
  border-color: #adb5bd;
}

.google-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-icon {
  margin-right: 8px;
  font-size: 1.2rem;
}

.login-link {
  text-align: center;
  margin-top: 20px;
  color: #6c757d;
}

.login-link a {
  color: #667eea;
  text-decoration: none;
  font-weight: 600;
}

.login-link a:hover {
  text-decoration: underline;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .signup-card {
    padding: 30px 20px;
  }

  .signup-title {
    font-size: 1.75rem;
  }
}
</style>