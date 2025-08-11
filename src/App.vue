<template>
  <div class="app-layout">
    <div v-if="isMobileNavOpen && isMobile" class="side-nav-overlay" @click="closeMobileNav"></div>
    
    <SideNav v-model:isMobileNavOpen="isMobileNavOpen" /> 

    <div class="main-content">
      <button v-if="isMobile && !isMobileNavOpen" class="hamburger-menu-button" @click="toggleMobileNav">
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

// auth 스토어를 가져옵니다.
const authStore = useAuthStore();
const themeStore = useThemeStore();
const route = useRoute();

const isMobileNavOpen = ref(false); 
const isMobile = ref(false);

const toggleMobileNav = () => {
  isMobileNavOpen.value = !isMobileNavOpen.value;
  console.log("App.vue: Toggled isMobileNavOpen to", isMobileNavOpen.value);
};

const closeMobileNav = () => {
  isMobileNavOpen.value = false;
  console.log("App.vue: Closed mobile nav. isMobileNavOpen =", isMobileNavOpen.value);
};

const checkMobile = () => {
  const newIsMobile = window.innerWidth <= 768; 
  if (isMobile.value !== newIsMobile) { 
    console.log(`App.vue: Screen width: ${window.innerWidth}px, isMobile changed from ${isMobile.value} to ${newIsMobile}`);
  }
  isMobile.value = newIsMobile;
  
  if (!isMobile.value) { 
    isMobileNavOpen.value = true;
    console.log("App.vue: Desktop mode, forced isMobileNavOpen to true.");
  } else { 
    isMobileNavOpen.value = false;
    console.log("App.vue: Mobile mode, forced isMobileNavOpen to false.");
  }
};

onMounted(() => {
  checkMobile();
  authStore.initialize();
  window.addEventListener('resize', checkMobile);
  
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
  window.removeEventListener('resize', checkMobile);
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
