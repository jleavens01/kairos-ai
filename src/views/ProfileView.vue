<template>
  <div class="profile-container">
    <div class="profile-header">
      <h1>프로필 설정</h1>
      <p class="subtitle">계정 정보와 개인 설정을 관리하세요</p>
    </div>

    <div class="profile-content">
      <!-- 프로필 카드 -->
      <div class="profile-card">
        <div class="card-header">
          <h2>프로필 정보</h2>
        </div>
        
        <div class="card-body">
          <div class="profile-info">
            <div class="avatar-section">
              <div class="avatar">
                <img v-if="profileStore.currentProfile?.avatar_url" 
                     :src="profileStore.currentProfile.avatar_url" 
                     alt="Avatar" />
                <div v-else class="avatar-placeholder">
                  {{ profileStore.displayName?.[0]?.toUpperCase() || '?' }}
                </div>
              </div>
              <button class="btn-secondary">사진 변경</button>
            </div>

            <div class="info-section">
              <div class="info-item">
                <label>닉네임</label>
                <div class="info-value">
                  <span v-if="!editingNickname">{{ profileStore.displayName }}</span>
                  <input v-else 
                         v-model="newNickname" 
                         @keyup.enter="saveNickname"
                         @keyup.escape="cancelNicknameEdit"
                         class="edit-input" />
                  <button v-if="!editingNickname" 
                          @click="startNicknameEdit" 
                          class="btn-edit">편집</button>
                  <div v-else class="edit-actions">
                    <button @click="saveNickname" class="btn-save">저장</button>
                    <button @click="cancelNicknameEdit" class="btn-cancel">취소</button>
                  </div>
                </div>
              </div>

              <div class="info-item">
                <label>이메일</label>
                <div class="info-value">
                  {{ authStore.user?.email }}
                  <span class="badge verified">인증됨</span>
                </div>
              </div>

              <div class="info-item">
                <label>가입일</label>
                <div class="info-value">
                  {{ formatDate(profileStore.currentProfile?.created_at) }}
                </div>
              </div>

              <div class="info-item">
                <label>멤버십 등급</label>
                <div class="info-value">
                  <span class="tier-display" :class="profileStore.currentTier">
                    {{ getTierIcon(profileStore.currentTier) }}
                    {{ getTierName(profileStore.currentTier) }}
                  </span>
                  <router-link to="/billing" class="upgrade-link">업그레이드</router-link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 테마 설정 카드 -->
      <div class="settings-card">
        <div class="card-header">
          <h2>테마 설정</h2>
        </div>
        <div class="card-body">
          <div class="setting-item">
            <div class="setting-info">
              <label>다크 모드</label>
              <p class="setting-description">눈이 편안한 다크 테마를 사용합니다</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>

      <!-- 알림 설정 카드 -->
      <div class="settings-card">
        <div class="card-header">
          <h2>알림 설정</h2>
        </div>
        <div class="card-body">
          <div class="setting-item">
            <div class="setting-info">
              <label>이메일 알림</label>
              <p class="setting-description">프로젝트 업데이트 및 중요 알림을 이메일로 받습니다</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="emailNotifications" @change="updateNotificationSettings">
              <span class="slider"></span>
            </label>
          </div>
          <div class="setting-item">
            <div class="setting-info">
              <label>마케팅 수신</label>
              <p class="setting-description">신규 기능 및 프로모션 정보를 받습니다</p>
            </div>
            <label class="toggle-switch">
              <input type="checkbox" v-model="marketingEmails" @change="updateNotificationSettings">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      </div>

      <!-- 계정 관리 카드 -->
      <div class="danger-card">
        <div class="card-header">
          <h2>계정 관리</h2>
        </div>
        <div class="card-body">
          <div class="danger-actions">
            <button class="btn-danger-outline" @click="handleSignOut">로그아웃</button>
            <button class="btn-danger" @click="showDeleteModal = true">계정 삭제</button>
          </div>
          <p class="danger-warning">
            계정을 삭제하면 모든 프로젝트와 데이터가 영구적으로 삭제되며 복구할 수 없습니다.
          </p>
        </div>
      </div>
    </div>

    <!-- 계정 삭제 확인 모달 -->
    <div v-if="showDeleteModal" class="modal-overlay" @click.self="showDeleteModal = false">
      <div class="modal-content">
        <h2>계정 삭제 확인</h2>
        <p>정말로 계정을 삭제하시겠습니까?</p>
        <p class="warning-text">이 작업은 되돌릴 수 없으며, 모든 데이터가 영구적으로 삭제됩니다.</p>
        <div class="modal-actions">
          <button @click="showDeleteModal = false" class="btn-cancel">취소</button>
          <button @click="deleteAccount" class="btn-danger">계정 삭제</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useProfileStore } from '@/stores/profile'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'

const router = useRouter()
const authStore = useAuthStore()
const profileStore = useProfileStore()

const editingNickname = ref(false)
const newNickname = ref('')
const emailNotifications = ref(true)
const marketingEmails = ref(false)
const showDeleteModal = ref(false)

onMounted(async () => {
  await profileStore.fetchProfile()
  // 알림 설정 불러오기 (추후 구현)
})

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const getTierIcon = (tier) => {
  const icons = {
    free: '✨',
    basic: '⭐',
    pro: '💎',
    enterprise: '👑'
  }
  return icons[tier] || '✨'
}

const getTierName = (tier) => {
  const names = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
    enterprise: 'Enterprise'
  }
  return names[tier] || 'Free'
}

const startNicknameEdit = () => {
  editingNickname.value = true
  newNickname.value = profileStore.displayName
}

const saveNickname = async () => {
  if (newNickname.value && newNickname.value !== profileStore.displayName) {
    const result = await profileStore.updateNickname(newNickname.value)
    if (result.success) {
      editingNickname.value = false
    }
  } else {
    cancelNicknameEdit()
  }
}

const cancelNicknameEdit = () => {
  editingNickname.value = false
  newNickname.value = ''
}

const updateNotificationSettings = () => {
  // 알림 설정 업데이트 API 호출 (추후 구현)
  console.log('알림 설정 업데이트:', {
    emailNotifications: emailNotifications.value,
    marketingEmails: marketingEmails.value
  })
}

const handleSignOut = async () => {
  const result = await authStore.signOut()
  if (result.success) {
    router.push('/home')
  }
}

const deleteAccount = async () => {
  // 계정 삭제 API 호출 (추후 구현)
  console.log('계정 삭제 요청')
  showDeleteModal.value = false
}
</script>

<style scoped>
.profile-container {
  max-width: 900px;
  margin: 0 auto;
  padding: 40px 20px;
}

.profile-header {
  margin-bottom: 40px;
}

.profile-header h1 {
  font-size: 2rem;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-weight: 600;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

.profile-content {
  display: flex;
  flex-direction: column;
  gap: 25px;
}

.profile-card,
.settings-card,
.danger-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  box-shadow: var(--shadow-sm);
}

.card-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.card-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--text-primary);
  font-weight: 600;
}

.card-body {
  padding: 25px;
}

.profile-info {
  display: flex;
  gap: 40px;
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 15px;
}

.avatar {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid var(--border-color);
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: bold;
  color: white;
}

.info-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item label {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.info-value {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.05rem;
  color: var(--text-primary);
}

.edit-input {
  flex: 1;
  padding: 5px 10px;
  border: 1px solid var(--primary-color);
  border-radius: 5px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 1rem;
}

.edit-actions {
  display: flex;
  gap: 8px;
}

.btn-edit,
.btn-save,
.btn-cancel {
  padding: 5px 12px;
  border: none;
  border-radius: 5px;
  font-size: 0.85rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-edit {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.btn-save {
  background: var(--primary-gradient);
  color: white;
}

.btn-cancel {
  background: var(--bg-secondary);
  color: var(--text-secondary);
}

.badge {
  padding: 3px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
}

.badge.verified {
  background: rgba(74, 222, 128, 0.2);
  color: var(--success-color);
}

.tier-display {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  background: var(--bg-secondary);
  border-radius: 20px;
  font-weight: 500;
}

.tier-display.pro {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.2), rgba(52, 211, 153, 0.2));
  color: var(--primary-color);
}

.upgrade-link {
  color: var(--primary-color);
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
}

.upgrade-link:hover {
  text-decoration: underline;
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 15px 0;
}

.setting-item:not(:last-child) {
  border-bottom: 1px solid var(--border-color);
}

.setting-info {
  flex: 1;
}

.setting-info label {
  display: block;
  font-weight: 500;
  color: var(--text-primary);
  margin-bottom: 5px;
}

.setting-description {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin: 0;
}

.toggle-switch {
  position: relative;
  display: inline-block;
  width: 50px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--bg-secondary);
  transition: 0.4s;
  border-radius: 24px;
  border: 1px solid var(--border-color);
}

.slider:before {
  position: absolute;
  content: "";
  height: 16px;
  width: 16px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.4s;
  border-radius: 50%;
}

input:checked + .slider {
  background: var(--primary-gradient);
  border-color: transparent;
}

input:checked + .slider:before {
  transform: translateX(26px);
}

.danger-card .card-header {
  background: rgba(239, 68, 68, 0.1);
  border-bottom-color: rgba(239, 68, 68, 0.2);
}

.danger-actions {
  display: flex;
  gap: 15px;
  margin-bottom: 20px;
}

.btn-secondary,
.btn-danger-outline,
.btn-danger {
  padding: 10px 20px;
  border-radius: 5px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-secondary {
  background: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-danger-outline {
  background: transparent;
  color: var(--danger-color);
  border: 1px solid var(--danger-color);
}

.btn-danger {
  background: var(--danger-color);
  color: white;
}

.btn-secondary:hover {
  background: var(--bg-primary);
}

.btn-danger-outline:hover {
  background: rgba(239, 68, 68, 0.1);
}

.btn-danger:hover {
  opacity: 0.9;
}

.danger-warning {
  color: var(--text-secondary);
  font-size: 0.9rem;
  margin: 0;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
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
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-color);
}

.modal-content h2 {
  margin: 0 0 15px 0;
  color: var(--text-primary);
}

.modal-content p {
  color: var(--text-secondary);
  margin-bottom: 10px;
}

.warning-text {
  color: var(--danger-color);
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 25px;
}

.modal-actions .btn-cancel,
.modal-actions .btn-danger {
  flex: 1;
}

@media (max-width: 768px) {
  .profile-container {
    padding: 20px 15px;
  }

  .profile-info {
    flex-direction: column;
    gap: 25px;
  }

  .avatar-section {
    align-items: center;
  }

  .danger-actions {
    flex-direction: column;
  }

  .btn-danger-outline,
  .btn-danger {
    width: 100%;
  }
}
</style>