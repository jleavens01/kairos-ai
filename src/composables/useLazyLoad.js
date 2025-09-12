import { ref, onMounted, onUnmounted } from 'vue'

// 전역 IntersectionObserver 인스턴스 (성능 최적화)
let globalObserver = null
const observedElements = new Map()

function createGlobalObserver() {
  if (!globalObserver && 'IntersectionObserver' in window) {
    globalObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const callback = observedElements.get(entry.target)
          if (callback && entry.isIntersecting) {
            callback()
            // 한 번 로드되면 관찰 중지
            globalObserver.unobserve(entry.target)
            observedElements.delete(entry.target)
          }
        })
      },
      {
        root: null,
        rootMargin: '200px', // 더 넉넉한 여백으로 프리로딩
        threshold: [0, 0.1] // 다중 threshold로 더 정확한 감지
      }
    )
  }
  return globalObserver
}

export function useLazyLoad(callback, options = {}) {
  const elementRef = ref(null)
  const isVisible = ref(false)
  const hasLoaded = ref(false)
  
  const customOptions = {
    rootMargin: options.rootMargin || '200px',
    threshold: options.threshold || 0.1,
    immediate: options.immediate || false // 즉시 로딩 옵션
  }
  
  const handleLoad = () => {
    if (!hasLoaded.value) {
      isVisible.value = true
      hasLoaded.value = true
      
      if (callback) {
        // 콜백을 비동기로 실행 (UI 블로킹 방지)
        requestAnimationFrame(() => {
          try {
            callback()
          } catch (error) {
            console.error('LazyLoad callback error:', error)
          }
        })
      }
    }
  }
  
  onMounted(() => {
    if (!elementRef.value) return
    
    // 즉시 로딩 모드
    if (customOptions.immediate) {
      handleLoad()
      return
    }
    
    // IntersectionObserver 지원 확인
    if (!('IntersectionObserver' in window)) {
      handleLoad()
      return
    }
    
    // 전역 Observer 사용 (성능 최적화)
    const observer = createGlobalObserver()
    if (observer) {
      observedElements.set(elementRef.value, handleLoad)
      observer.observe(elementRef.value)
    } else {
      handleLoad()
    }
  })
  
  onUnmounted(() => {
    if (elementRef.value && globalObserver) {
      globalObserver.unobserve(elementRef.value)
      observedElements.delete(elementRef.value)
      
      // 모든 요소가 제거되면 observer도 정리
      if (observedElements.size === 0) {
        globalObserver.disconnect()
        globalObserver = null
      }
    }
  })
  
  // 수동 로드 트리거 (필요시)
  const forceLoad = () => {
    if (!hasLoaded.value) {
      handleLoad()
    }
  }
  
  return {
    elementRef,
    isVisible,
    hasLoaded,
    forceLoad
  }
}