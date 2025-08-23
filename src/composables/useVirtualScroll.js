import { ref, computed, onMounted, onUnmounted } from 'vue'

export function useVirtualScroll(items, itemHeight = 300, buffer = 3) {
  const containerRef = ref(null)
  const scrollTop = ref(0)
  const containerHeight = ref(0)
  
  // 보이는 아이템 계산
  const visibleItems = computed(() => {
    if (!containerHeight.value || !items.value?.length) {
      return []
    }
    
    const startIndex = Math.max(0, Math.floor(scrollTop.value / itemHeight) - buffer)
    const endIndex = Math.min(
      items.value.length,
      Math.ceil((scrollTop.value + containerHeight.value) / itemHeight) + buffer
    )
    
    return items.value.slice(startIndex, endIndex).map((item, index) => ({
      ...item,
      virtualIndex: startIndex + index,
      virtualTop: (startIndex + index) * itemHeight
    }))
  })
  
  // 전체 높이 계산
  const totalHeight = computed(() => items.value?.length * itemHeight || 0)
  
  // 스크롤 핸들러
  const handleScroll = (event) => {
    scrollTop.value = event.target.scrollTop
  }
  
  // 컨테이너 크기 업데이트
  const updateContainerSize = () => {
    if (containerRef.value) {
      containerHeight.value = containerRef.value.clientHeight
    }
  }
  
  // ResizeObserver 설정
  let resizeObserver = null
  
  onMounted(() => {
    updateContainerSize()
    
    if (containerRef.value) {
      resizeObserver = new ResizeObserver(updateContainerSize)
      resizeObserver.observe(containerRef.value)
    }
  })
  
  onUnmounted(() => {
    if (resizeObserver && containerRef.value) {
      resizeObserver.unobserve(containerRef.value)
      resizeObserver.disconnect()
    }
  })
  
  return {
    containerRef,
    visibleItems,
    totalHeight,
    handleScroll
  }
}