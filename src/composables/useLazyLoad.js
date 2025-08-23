import { ref, onMounted, onUnmounted } from 'vue'

export function useLazyLoad(callback, options = {}) {
  const elementRef = ref(null)
  const isVisible = ref(false)
  const hasLoaded = ref(false)
  
  let observer = null
  
  const observerOptions = {
    root: options.root || null,
    rootMargin: options.rootMargin || '50px',
    threshold: options.threshold || 0.01
  }
  
  const handleIntersection = (entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting && !hasLoaded.value) {
        isVisible.value = true
        hasLoaded.value = true
        
        if (callback) {
          callback()
        }
        
        // 한 번 로드되면 관찰 중지
        if (observer && elementRef.value) {
          observer.unobserve(elementRef.value)
        }
      }
    })
  }
  
  onMounted(() => {
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(handleIntersection, observerOptions)
      
      if (elementRef.value) {
        observer.observe(elementRef.value)
      }
    } else {
      // IntersectionObserver를 지원하지 않는 경우 즉시 로드
      isVisible.value = true
      hasLoaded.value = true
      if (callback) {
        callback()
      }
    }
  })
  
  onUnmounted(() => {
    if (observer && elementRef.value) {
      observer.unobserve(elementRef.value)
      observer.disconnect()
    }
  })
  
  return {
    elementRef,
    isVisible,
    hasLoaded
  }
}