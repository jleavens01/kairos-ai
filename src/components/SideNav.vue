<template>
  <nav class="side-nav" :class="{ 'mobile-nav-open': isMobile && isMobileNavOpen, 'mobile-nav-closed': isMobile && !isMobileNavOpen }">
    <div class="nav-header">
      <router-link to="/home" class="logo-link">
        <h2 class="app-title">Kairos AI</h2>
      </router-link>
      <button v-if="isMobile" @click="closeMobileNav" class="close-button">×</button>
    </div>
    
    <div class="nav-content">
      <!-- 비로그인 메뉴 -->
      <div v-if="!authStore.isLoggedIn" class="nav-section">
        <router-link to="/home" class="nav-item" @click="closeMobileNav">
          <span class="nav-icon">🏠</span>
          <span class="nav-text">홈</span>
        </router-link>
        <router-link to="/login" class="nav-item" @click="closeMobileNav">
          <span class="nav-icon">🔐</span>
          <span class="nav-text">로그인</span>
        </router-link>
      </div>

      <!-- 로그인 후 메뉴 -->
      <div v-else class="nav-section">
        <router-link to="/projects" class="nav-item main-nav-item" @click="closeMobileNav">
          <span class="nav-icon">📁</span>
          <span class="nav-text">프로젝트</span>
        </router-link>
        
        <!-- 최근 프로젝트 목록 -->
        <div class="recent-projects-list" v-if="recentProjects.length > 0">
          <router-link
            v-for="project in recentProjects"
            :key="project.id"
            :to="`/projects/${project.id}`"
            class="nav-item recent-project-item"
            :class="{ 'router-link-exact-active': project.id === currentProjectId }"
            @click="closeMobileNav"
          >
            <span class="project-name-text">{{ project.name }}</span>
          </router-link>
        </div>
        <div v-else-if="authStore.isLoggedIn" class="recent-projects-placeholder">
          <span>최근 프로젝트 없음</span>
        </div>
        <router-link to="/profile" class="nav-item" @click="closeMobileNav">
          <span class="nav-icon">👤</span>
          <span class="nav-text">프로필</span>
        </router-link>
        <router-link to="/billing" class="nav-item" @click="closeMobileNav">
          <span class="nav-icon">💳</span>
          <span class="nav-text">결제</span>
        </router-link>
      </div>
    </div>

    <!-- 로그인된 사용자 정보 및 로그아웃 -->
    <div v-if="authStore.isLoggedIn" class="nav-footer">
      <!-- 프로필 정보 -->
      <div v-if="profileStore.currentProfile" class="profile-section">
        <div class="profile-info">
          <div class="avatar">
            <img v-if="profileStore.currentProfile.avatar_url" 
                 :src="profileStore.currentProfile.avatar_url" 
                 alt="Avatar" />
            <div v-else class="avatar-placeholder">
              {{ profileStore.displayName[0]?.toUpperCase() }}
            </div>
          </div>
          <div class="profile-details">
            <div class="display-name">
              {{ profileStore.displayName }}
              <span class="tier-badge" :class="profileStore.currentTier">
                {{ getTierIcon(profileStore.currentTier) }}
              </span>
            </div>
            <div class="user-email">{{ authStore.user?.email }}</div>
          </div>
        </div>
        <div class="credits-info">
          <span class="credits-label">크레딧:</span>
          <span class="credits-value" :class="{ 'low': profileStore.isCreditsLow }">
            {{ profileStore.availableCredits }}
          </span>
        </div>
      </div>
      
      <!-- 테마 전환 버튼 -->
      <ThemeToggle />
      
      <!-- 로그아웃 버튼 -->
      <button @click="handleSignOut" class="logout-button">
        로그아웃
      </button>
    </div>
  </nav>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
import { useProfileStore } from '@/stores/profile';
import { useThemeStore } from '@/stores/theme';
import { useProjectsStore } from '@/stores/projects';
import { useRouter, useRoute } from 'vue-router';
import { computed, onMounted, onUnmounted, ref, watch } from 'vue';
import ThemeToggle from '@/components/ui/ThemeToggle.vue';

const props = defineProps({
  isMobileNavOpen: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['update:isMobileNavOpen']);

const authStore = useAuthStore();
const profileStore = useProfileStore();
const themeStore = useThemeStore();
const projectsStore = useProjectsStore();
const router = useRouter();
const route = useRoute();

const isMobile = ref(false);
const recentProjects = ref([]);
const currentProjectId = computed(() => route.params.projectId);

const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768;
};

const closeMobileNav = () => {
  if (isMobile.value) {
    emit('update:isMobileNavOpen', false);
  }
};

const handleSignOut = async () => {
  const result = await authStore.signOut();
  if (result.success) {
    router.push('/home');
    closeMobileNav();
  }
};

// 티어별 아이콘 반환
const getTierIcon = (tier) => {
  const icons = {
    free: '✨',
    basic: '⭐',
    pro: '💎',
    enterprise: '👑'
  };
  return icons[tier] || '✨';
};

// 최근 프로젝트 가져오기
const fetchRecentProjects = async () => {
  if (!authStore.isLoggedIn) {
    recentProjects.value = [];
    return;
  }
  
  // 스토어에서 프로젝트가 없으면 가져오기
  if (!projectsStore.projects.length) {
    await projectsStore.fetchProjects();
  }
  
  // 최근 업데이트된 프로젝트 5개 가져오기
  const sortedProjects = [...projectsStore.projects]
    .filter(p => !p.deleted_at)
    .sort((a, b) => new Date(b.updated_at) - new Date(a.updated_at))
    .slice(0, 5);
  
  recentProjects.value = sortedProjects;
};

// 날짜 포맷 함수
const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now - date;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours === 0) {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return diffMinutes === 0 ? '방금 전' : `${diffMinutes}분 전`;
    }
    return `${diffHours}시간 전`;
  }
  if (diffDays === 1) return '어제';
  if (diffDays < 7) return `${diffDays}일 전`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}주 전`;
  return date.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
};

// 로그인 상태 변경 시 최근 프로젝트 가져오기
watch(() => authStore.isLoggedIn, (isLoggedIn) => {
  if (isLoggedIn) {
    fetchRecentProjects();
  } else {
    recentProjects.value = [];
  }
});

// 프로젝트 스토어 변경 감지
watch(() => projectsStore.projects, () => {
  fetchRecentProjects();
}, { deep: true });

onMounted(() => {
  checkMobile();
  window.addEventListener('resize', checkMobile);
  if (authStore.isLoggedIn) {
    fetchRecentProjects();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile);
});
</script>

<style scoped>
.side-nav {
  width: 250px;
  height: 100vh;
  background-color: #ffffff;
  color: var(--text-primary);
  position: fixed;
  left: 0;
  top: 0;
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-md);
  transition: transform 0.3s ease-in-out, background-color 0.3s;
  border-right: 1px solid var(--border-color);
}

.dark .side-nav {
  background-color: #1a1a1a;
  color: #e0e0e0;
}

.nav-header {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.logo-link {
  text-decoration: none;
  color: white;
}

.app-title {
  margin: 0;
  font-size: 2rem;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
  font-weight: 700;
}

.close-button {
  display: none;
  background: none;
  border: none;
  color: white;
  font-size: 2rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.nav-content {
  flex: 1;
  padding: 0;
  overflow-y: auto;
}

.nav-section {
  margin-bottom: 20px;
  padding: 0 10px;
}

.nav-item {
  display: flex;
  align-items: center;
  padding: 12px 20px;
  color: var(--text-secondary);
  text-decoration: none;
  transition: background-color 0.3s, color 0.3s;
  border-radius: 6px;
  margin: 0 10px;
}

.nav-item:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.nav-item.router-link-active {
  color: var(--primary-color);
  font-weight: 600;
}

/* 최근 프로젝트 스타일 */
.recent-projects-list {
  margin: 4px 0;
  padding-left: 32px;
}

.recent-project-item {
  font-size: 0.9rem;
  padding: 8px 12px;
  margin: 2px 0;
}

.recent-project-item.router-link-exact-active {
  color: var(--primary-color);
  font-weight: 600;
}

.project-name-text {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.recent-projects-placeholder {
  padding: 12px 20px;
  padding-left: 44px;
  font-size: 0.85rem;
  color: var(--text-tertiary);
  font-style: italic;
}

/* 메인 프로젝트 아이템 강조 */
.main-nav-item {
  font-weight: 600;
  margin-bottom: 4px;
}

.nav-icon {
  margin-right: 12px;
  font-size: 1.2rem;
}

.nav-text {
  font-size: 0.95rem;
}

.nav-footer {
  padding: 15px;
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.user-email {
  font-size: 0.75rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-top: 2px;
}

.logout-button {
  width: 100%;
  padding: 10px;
  background-color: transparent;
  color: var(--danger-color);
  border: 1px solid var(--danger-color);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.3s;
}

.logout-button:hover {
  background-color: var(--danger-color);
  color: white;
}

/* 프로필 섹션 스타일 */
.profile-section {
  padding: 5px;
  border-radius: 8px;
}

.profile-info {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.avatar {
  width: 36px;
  height: 36px;
  flex-shrink: 0;
}

.avatar img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: var(--primary-gradient);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: bold;
  color: white;
}

.profile-details {
  flex: 1;
  min-width: 0;
}

.display-name {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tier-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin-left: 6px;
  font-size: 0.85rem;
  vertical-align: middle;
  filter: saturate(1.2);
}

.tier-badge.free {
  filter: grayscale(0.3);
}

.tier-badge.basic {
  filter: hue-rotate(0deg) brightness(1.1);
}

.tier-badge.pro {
  filter: hue-rotate(200deg) brightness(1.2);
}

.tier-badge.enterprise {
  filter: hue-rotate(280deg) brightness(1.2) contrast(1.1);
}

.credits-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  border-radius: 6px;
  margin-top: 8px;
}

.credits-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-weight: 500;
}

.credits-value {
  font-size: 1rem;
  font-weight: bold;
  color: var(--primary-color);
}

.credits-value.low {
  color: var(--warning-color);
}

/* 모바일 스타일 */
@media (max-width: 768px) {
  .side-nav {
    z-index: 100;
  }

  .mobile-nav-closed {
    transform: translateX(-100%);
  }

  .mobile-nav-open {
    transform: translateX(0);
  }

  .close-button {
    display: flex;
  }
}
</style>