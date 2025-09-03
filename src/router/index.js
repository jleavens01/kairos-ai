import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

// 뷰(페이지) 컴포넌트들을 import 합니다.
import HomeView from '../views/HomeView.vue'
import LoginView from '../views/LoginView.vue'
import ProjectListView from '../views/ProjectListView.vue'
import ProjectDetailView from '../views/ProjectDetailView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home'
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView
    },
    {
      path: '/login',
      name: 'login',
      component: LoginView
    },
    {
      path: '/projects',
      name: 'projects',
      component: ProjectListView,
      meta: { requiresAuth: true }
    },
    {
      path: '/projects/:id',
      name: 'project-detail',
      component: ProjectDetailView,
      meta: { requiresAuth: true }
    },
    {
      path: '/ui-test',
      name: 'ui-test',
      component: () => import('../views/UITestView.vue')
    },
    {
      path: '/ai-content',
      name: 'ai-content',
      component: () => import('../components/ai-content-production/AIContentDashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/billing',
      name: 'billing',
      component: () => import('../views/BillingView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/library',
      name: 'library',
      component: () => import('../views/LibraryView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/explore',
      name: 'explore',
      component: () => import('../views/ExploreView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/storyboard-lab',
      name: 'storyboard-lab',
      component: () => import('../views/StoryboardLabView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/semoji',
      name: 'semoji',
      component: () => import('../views/ProductionView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/semoji-data',
      name: 'semojiData',
      component: () => import('../components/production/SemojiDataManager.vue'),
      meta: { requiresAuth: true }
    }
  ]
})

// 초기화 상태를 추적하는 변수
let isInitialized = false

// 로그인 상태에 따른 라우트 가드
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore()
  
  // 최초 한 번만 초기화 실행
  if (!isInitialized) {
    await authStore.initialize()
    isInitialized = true
  }
  
  // 인증이 필요한 페이지인데 로그인되어 있지 않은 경우
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    // 현재 경로를 저장하여 로그인 후 리다이렉트할 수 있도록 함
    sessionStorage.setItem('redirectPath', to.fullPath)
    next('/login')
  } 
  // 이미 로그인되어 있는데 로그인 페이지로 가려는 경우
  else if (to.path === '/login' && authStore.isLoggedIn) {
    // 저장된 리다이렉트 경로가 있으면 그곳으로, 없으면 프로젝트 목록으로
    const redirectPath = sessionStorage.getItem('redirectPath')
    if (redirectPath) {
      sessionStorage.removeItem('redirectPath')
      next(redirectPath)
    } else {
      next('/projects')
    }
  } 
  else {
    next()
  }
})

export default router