<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-logo">
        <span class="logo-icon">🚀</span>
      </div>
      <h1 class="login-title">Kairos AI</h1>
      <p class="login-subtitle">AI로 만드는 창의적인 콘텐츠</p>
      
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <button @click="handleGoogleLogin" class="google-button" :disabled="loading">
        <svg class="google-icon" viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg">
          <g transform="matrix(1, 0, 0, 1, 27.009001, -39.238998)">
            <path fill="#4285F4" d="M -3.264 51.509 C -3.264 50.719 -3.334 49.969 -3.454 49.239 L -14.754 49.239 L -14.754 53.749 L -8.284 53.749 C -8.574 55.229 -9.424 56.479 -10.684 57.329 L -10.684 60.329 L -6.824 60.329 C -4.564 58.239 -3.264 55.159 -3.264 51.509 Z"/>
            <path fill="#34A853" d="M -14.754 63.239 C -11.514 63.239 -8.804 62.159 -6.824 60.329 L -10.684 57.329 C -11.764 58.049 -13.134 58.489 -14.754 58.489 C -17.884 58.489 -20.534 56.379 -21.484 53.529 L -25.464 53.529 L -25.464 56.619 C -23.494 60.539 -19.444 63.239 -14.754 63.239 Z"/>
            <path fill="#FBBC05" d="M -21.484 53.529 C -21.734 52.809 -21.864 52.039 -21.864 51.239 C -21.864 50.439 -21.724 49.669 -21.484 48.949 L -21.484 45.859 L -25.464 45.859 C -26.284 47.479 -26.754 49.299 -26.754 51.239 C -26.754 53.179 -26.284 54.999 -25.464 56.619 L -21.484 53.529 Z"/>
            <path fill="#EA4335" d="M -14.754 43.989 C -12.984 43.989 -11.404 44.599 -10.154 45.789 L -6.734 42.369 C -8.804 40.429 -11.514 39.239 -14.754 39.239 C -19.444 39.239 -23.494 41.939 -25.464 45.859 L -21.484 48.949 C -20.534 46.099 -17.884 43.989 -14.754 43.989 Z"/>
          </g>
        </svg>
        {{ loading ? '로그인 중...' : 'Google로 계속하기' }}
      </button>

      <div class="login-footer">
        <p class="terms-text">
          로그인하면 <a href="#" @click.prevent>서비스 약관</a> 및 
          <a href="#" @click.prevent>개인정보 처리방침</a>에 동의하는 것입니다.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();

const loading = ref(false);
const error = ref('');

const handleGoogleLogin = async () => {
  loading.value = true;
  error.value = '';
  
  const result = await authStore.signInWithGoogle();
  
  if (!result.success) {
    error.value = result.error || 'Google 로그인에 실패했습니다. 다시 시도해주세요.';
  }
  // Google OAuth는 리다이렉트 방식이므로 별도 라우팅 불필요
  
  loading.value = false;
};
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-secondary);
  padding: 20px;
  transition: background-color 0.3s;
}

.login-card {
  background: var(--bg-primary);
  border-radius: 10px;
  border: 1px solid var(--border-color);
  box-shadow: var(--shadow-lg);
  padding: 40px;
  width: 100%;
  max-width: 400px;
  transition: all 0.3s;
}

.login-title {
  font-size: 2rem;
  font-weight: 700;
  background: linear-gradient(to right, #4ade80, #34d399);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  text-align: center;
  margin-bottom: 10px;
}

.login-form {
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
  background-color: rgba(239, 68, 68, 0.1);
  color: var(--danger-color);
  padding: 10px;
  border-radius: 5px;
  margin-bottom: 15px;
  font-size: 0.9rem;
  border: 1px solid rgba(239, 68, 68, 0.3);
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
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
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
  background-color: var(--bg-secondary);
  border-color: var(--primary-color);
}

.google-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-logo {
  text-align: center;
  margin-bottom: 20px;
}

.logo-icon {
  font-size: 4rem;
}

.login-subtitle {
  text-align: center;
  color: var(--text-secondary);
  margin-bottom: 30px;
}

.google-icon {
  margin-right: 8px;
  vertical-align: middle;
}

.login-footer {
  margin-top: 30px;
  padding-top: 20px;
  border-top: 1px solid #dee2e6;
}

.terms-text {
  font-size: 0.85rem;
  color: var(--text-secondary);
  text-align: center;
  line-height: 1.5;
}

.terms-text a {
  color: var(--primary-color);
  text-decoration: none;
}

.terms-text a:hover {
  text-decoration: underline;
}


/* 모바일 반응형 */
@media (max-width: 768px) {
  .login-card {
    padding: 30px 20px;
  }

  .login-title {
    font-size: 1.75rem;
  }
}
</style>