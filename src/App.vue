<template>
  <div class="app-layout" :class="{ 'nav-collapsed': isNavCollapsed && !isMobile }">
    <div v-if="(isMobileNavOpen && (isMobile || isTablet)) || (isNavExpanded && !isMobile && !isTablet)" 
         class="side-nav-overlay" 
         @click="closeMobileNav"></div>
    
    <SideNav 
      v-model:isMobileNavOpen="isMobileNavOpen"
      :isCollapsed="false" /> 

    <div class="main-content">
      <!-- 햄버거 메뉴 버튼 (모바일/태블릿만) -->
      <button 
        v-if="(isMobile || isTablet) && !isMobileNavOpen" 
        class="hamburger-menu-button"
        @click="toggleNav">
        ☰
      </button>

      <RouterView />
    </div>
  </div>
</template>

<script setup>
import { RouterView, useRoute } from 'vue-router';
import SideNav from '@/components/SideNav.vue'; 
import { ref, onMounted, onUnmounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useThemeStore } from '@/stores/theme';
import { useGlobalFailureRecovery } from '@/composables/useFailureRecovery';

// auth 스토어를 가져옵니다.
const authStore = useAuthStore();
const themeStore = useThemeStore();
const route = useRoute();

// 글로벌 실패 복구 시스템 초기화
const failureRecovery = useGlobalFailureRecovery();

const isMobileNavOpen = ref(false); 
const isMobile = ref(false);
const isTablet = ref(false);
const isNavCollapsed = ref(false);
const isNavExpanded = ref(false);

const toggleNav = () => {
  if (isMobile.value || isTablet.value) {
    isMobileNavOpen.value = !isMobileNavOpen.value;
  }
  // 데스크톱에서는 아무 동작 없음
};

const toggleMobileNav = toggleNav; // 이전 버전 호환성

const closeMobileNav = () => {
  isMobileNavOpen.value = false;
  // Debug log removed
};

const checkScreenSize = () => {
  const width = window.innerWidth;
  
  // 화면 크기별 breakpoint
  const newIsMobile = width <= 768;
  const newIsTablet = width > 768 && width <= 1024;
  
  isMobile.value = newIsMobile;
  isTablet.value = newIsTablet;
  
  if (!isMobile.value && !isTablet.value) { 
    // 데스크톱 모드
    isMobileNavOpen.value = false;
    isNavCollapsed.value = false; // 데스크톱에서는 항상 펼침
  } else { 
    // 모바일/태블릿 모드에서는 기본적으로 닫힌 상태
    isMobileNavOpen.value = false;
    isNavCollapsed.value = false;
  }
};

const checkMobile = checkScreenSize; // 이전 버전 호환성

onMounted(() => {
  checkScreenSize();
  authStore.initialize();
  window.addEventListener('resize', checkScreenSize);
  
  // 테마 초기화 (비로그인 사용자용)
  const savedTheme = localStorage.getItem('theme');
  if (savedTheme) {
    themeStore.mode = savedTheme;
    themeStore.applyTheme();
  } else {
    themeStore.initializeTheme();
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', checkScreenSize);
});
</script>

<style scoped>
.app-layout {
  display: flex;
  min-height: 100vh;
  background-color: var(--bg-primary);
  transition: background-color 0.3s;
}

.main-content {
  flex-grow: 1;
  margin-left: 250px; 
  padding: 0; 
  width: calc(100% - 250px);
  transition: margin-left 0.3s, width 0.3s;
}

/* 데스크톱에서는 네비게이션 항상 고정 너비 */

/* --- 태블릿 반응형 스타일 --- */
@media (min-width: 769px) and (max-width: 1024px) {
  .main-content {
    margin-left: 0;
    width: 100%;
    padding: 1rem;
    padding-top: 4rem;
  }
  
  .hamburger-menu-button {
    position: fixed;
    top: 1rem;
    left: 1rem;
    z-index: 101;
    background: var(--primary-gradient);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s;
  }
  
  .hamburger-menu-button:hover {
    transform: scale(1.05);
    box-shadow: var(--shadow-md);
  }
  
  /* 사이드바가 열려있을 때 배경을 어둡게 하는 오버레이 */
  .side-nav-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 99;
  }
}

/* --- 모바일 반응형 스타일 --- */
@media (max-width: 768px) {
  .app-layout {
    flex-direction: column;
  }

  .main-content {
    margin-left: 0; 
    width: 100%; 
    padding: 1rem;
    padding-top: 4rem;
    box-sizing: border-box; 
  }

  /* 햄버거 메뉴 버튼 */
  .hamburger-menu-button {
    position: fixed; 
    top: 1rem;
    left: 1rem;
    z-index: 101; 
    background: var(--primary-gradient);
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.5rem;
    font-size: 1.5rem;
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: all 0.3s;
  }
  
  .hamburger-menu-button:hover {
    transform: scale(1.05);
    box-shadow: var(--shadow-md);
  }
  
  /* 사이드바가 열려있을 때 배경을 어둡게 하는 오버레이 */
  .side-nav-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background-color: rgba(0, 0, 0, 0.5);
    z-index: 99; 
  }
}
</style>
