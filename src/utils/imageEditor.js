// 이미지 편집 유틸리티 모듈
import { ref, reactive, computed } from 'vue'

// 편집 모드 상수
export const EDIT_MODES = {
  NONE: 'none',
  CROP: 'crop',
  LAYERS: 'layers',
  FILTER: 'filter'
}

// 크롭 비율 프리셋
export const CROP_RATIOS = {
  FREE: { label: '자유', value: null },
  SQUARE: { label: '1:1', value: 1 },
  PORTRAIT_4_3: { label: '4:3', value: 4/3 },
  PORTRAIT_3_2: { label: '3:2', value: 3/2 },
  LANDSCAPE_16_9: { label: '16:9', value: 16/9 },
  LANDSCAPE_21_9: { label: '21:9', value: 21/9 },
  PORTRAIT_3_4: { label: '3:4', value: 3/4 },
  PORTRAIT_2_3: { label: '2:3', value: 2/3 },
  PORTRAIT_9_16: { label: '9:16', value: 9/16 },
  PORTRAIT_9_21: { label: '9:21', value: 9/21 }
}

// 이미지 편집기 클래스
export class ImageEditor {
  constructor(imageUrl) {
    this.originalImage = imageUrl
    this.canvas = null
    this.ctx = null
    this.image = null
    this.cropData = reactive({
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      ratio: null,
      isDragging: false,
      isResizing: false,
      startX: 0,
      startY: 0,
      handle: null // 리사이즈 핸들 위치
    })
    this.layers = reactive([])
    this.activeLayerIndex = -1
    this.editMode = EDIT_MODES.NONE
    this.isLoading = false
  }

  // 캔버스 초기화
  async initCanvas(canvasElement) {
    this.canvas = canvasElement
    this.ctx = this.canvas.getContext('2d')
    
    // 이미지 로드
    this.isLoading = true
    try {
      this.image = await this.loadImage(this.originalImage)
      
      // 최대 크기 제한 (편집 영역에 맞게)
      const maxWidth = 800
      const maxHeight = 600
      
      let canvasWidth = this.image.width
      let canvasHeight = this.image.height
      
      // 이미지가 최대 크기보다 크면 비율 유지하며 축소
      if (canvasWidth > maxWidth || canvasHeight > maxHeight) {
        const widthRatio = maxWidth / canvasWidth
        const heightRatio = maxHeight / canvasHeight
        const scale = Math.min(widthRatio, heightRatio)
        
        canvasWidth = Math.floor(canvasWidth * scale)
        canvasHeight = Math.floor(canvasHeight * scale)
      }
      
      // 캔버스 크기 설정
      this.canvas.width = canvasWidth
      this.canvas.height = canvasHeight
      
      // 스케일 저장
      this.scale = canvasWidth / this.image.width
      
      this.drawImage()
      
      // 초기 크롭 영역 설정 (전체 이미지)
      this.cropData.width = canvasWidth
      this.cropData.height = canvasHeight
    } catch (error) {
      console.error('이미지 로드 실패:', error)
      throw error
    } finally {
      this.isLoading = false
    }
  }

  // 이미지 로드
  loadImage(url) {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous' // CORS 설정
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  // 기본 이미지 그리기
  drawImage() {
    if (!this.ctx || !this.image) return
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    
    // 배경 이미지 그리기 (스케일 적용)
    this.ctx.drawImage(
      this.image, 
      0, 0, 
      this.image.width, 
      this.image.height,
      0, 0, 
      this.canvas.width, 
      this.canvas.height
    )
    
    // 레이어 그리기
    this.layers.forEach((layer, index) => {
      if (layer.visible) {
        this.ctx.globalAlpha = layer.opacity
        const scale = this.scale || 1
        this.ctx.drawImage(
          layer.image,
          layer.x * scale,
          layer.y * scale,
          layer.width * scale,
          layer.height * scale
        )
        this.ctx.globalAlpha = 1
      }
    })
    
    // 크롭 모드일 때 크롭 영역 표시
    if (this.editMode === EDIT_MODES.CROP) {
      this.drawCropOverlay()
    }
  }

  // 크롭 오버레이 그리기
  drawCropOverlay() {
    if (!this.ctx) return
    
    const { x, y, width, height } = this.cropData
    const scale = this.scale || 1
    
    // 어두운 오버레이
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height)
    
    // 크롭 영역 클리어 및 이미지 다시 그리기
    this.ctx.save()
    this.ctx.beginPath()
    this.ctx.rect(x, y, width, height)
    this.ctx.clip()
    
    // 크롭 영역에만 원본 이미지 그리기
    this.ctx.drawImage(
      this.image,
      0, 0,
      this.image.width,
      this.image.height,
      0, 0,
      this.canvas.width,
      this.canvas.height
    )
    this.ctx.restore()
    
    // 크롭 영역 테두리
    this.ctx.strokeStyle = '#fff'
    this.ctx.lineWidth = 2
    this.ctx.setLineDash([5, 5])
    this.ctx.strokeRect(x, y, width, height)
    this.ctx.setLineDash([])
    
    // 리사이즈 핸들 그리기
    this.drawResizeHandles(x, y, width, height)
    
    // 격자 그리기 (Rule of Thirds)
    this.drawGrid(x, y, width, height)
  }

  // 리사이즈 핸들 그리기
  drawResizeHandles(x, y, width, height) {
    const handleSize = 8
    const handles = [
      { x: x - handleSize/2, y: y - handleSize/2, cursor: 'nw-resize', position: 'tl' },
      { x: x + width - handleSize/2, y: y - handleSize/2, cursor: 'ne-resize', position: 'tr' },
      { x: x - handleSize/2, y: y + height - handleSize/2, cursor: 'sw-resize', position: 'bl' },
      { x: x + width - handleSize/2, y: y + height - handleSize/2, cursor: 'se-resize', position: 'br' },
      { x: x + width/2 - handleSize/2, y: y - handleSize/2, cursor: 'n-resize', position: 't' },
      { x: x + width/2 - handleSize/2, y: y + height - handleSize/2, cursor: 's-resize', position: 'b' },
      { x: x - handleSize/2, y: y + height/2 - handleSize/2, cursor: 'w-resize', position: 'l' },
      { x: x + width - handleSize/2, y: y + height/2 - handleSize/2, cursor: 'e-resize', position: 'r' }
    ]
    
    this.ctx.fillStyle = '#fff'
    handles.forEach(handle => {
      this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize)
    })
  }

  // 격자 그리기
  drawGrid(x, y, width, height) {
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'
    this.ctx.lineWidth = 1
    
    // 수직선
    for (let i = 1; i < 3; i++) {
      const lineX = x + (width / 3) * i
      this.ctx.beginPath()
      this.ctx.moveTo(lineX, y)
      this.ctx.lineTo(lineX, y + height)
      this.ctx.stroke()
    }
    
    // 수평선
    for (let i = 1; i < 3; i++) {
      const lineY = y + (height / 3) * i
      this.ctx.beginPath()
      this.ctx.moveTo(x, lineY)
      this.ctx.lineTo(x + width, lineY)
      this.ctx.stroke()
    }
  }

  // 크롭 비율 설정
  setCropRatio(ratio) {
    this.cropData.ratio = ratio
    
    if (ratio) {
      // 비율에 맞게 크롭 영역 조정
      const currentRatio = this.cropData.width / this.cropData.height
      
      if (currentRatio > ratio) {
        // 너비를 줄임
        this.cropData.width = this.cropData.height * ratio
      } else {
        // 높이를 줄임
        this.cropData.height = this.cropData.width / ratio
      }
      
      // 경계 체크
      this.constrainCropArea()
    }
    
    this.drawImage()
  }

  // 크롭 영역 제한
  constrainCropArea() {
    // 최소 크기
    const minSize = 50
    this.cropData.width = Math.max(this.cropData.width, minSize)
    this.cropData.height = Math.max(this.cropData.height, minSize)
    
    // 경계 체크
    this.cropData.x = Math.max(0, Math.min(this.cropData.x, this.canvas.width - this.cropData.width))
    this.cropData.y = Math.max(0, Math.min(this.cropData.y, this.canvas.height - this.cropData.height))
    
    // 비율 유지
    if (this.cropData.ratio) {
      const currentRatio = this.cropData.width / this.cropData.height
      if (Math.abs(currentRatio - this.cropData.ratio) > 0.01) {
        this.cropData.width = this.cropData.height * this.cropData.ratio
      }
    }
  }

  // 마우스 이벤트 핸들러
  handleMouseDown(e) {
    if (this.editMode !== EDIT_MODES.CROP) return
    
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // 리사이즈 핸들 체크
    const handle = this.getResizeHandle(x, y)
    if (handle) {
      this.cropData.isResizing = true
      this.cropData.handle = handle
    } else if (this.isInsideCropArea(x, y)) {
      // 크롭 영역 내부 클릭 - 드래그 시작
      this.cropData.isDragging = true
      this.cropData.startX = x - this.cropData.x
      this.cropData.startY = y - this.cropData.y
    }
  }

  handleMouseMove(e) {
    if (this.editMode !== EDIT_MODES.CROP) return
    
    const rect = this.canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    if (this.cropData.isDragging) {
      // 크롭 영역 이동
      this.cropData.x = x - this.cropData.startX
      this.cropData.y = y - this.cropData.startY
      this.constrainCropArea()
      this.drawImage()
    } else if (this.cropData.isResizing) {
      // 크롭 영역 리사이즈
      this.resizeCropArea(x, y)
      this.drawImage()
    } else {
      // 커서 변경
      const handle = this.getResizeHandle(x, y)
      if (handle) {
        this.canvas.style.cursor = handle.cursor
      } else if (this.isInsideCropArea(x, y)) {
        this.canvas.style.cursor = 'move'
      } else {
        this.canvas.style.cursor = 'default'
      }
    }
  }

  handleMouseUp() {
    this.cropData.isDragging = false
    this.cropData.isResizing = false
    this.cropData.handle = null
  }

  // 리사이즈 핸들 찾기
  getResizeHandle(x, y) {
    const handleSize = 16
    const { x: cropX, y: cropY, width, height } = this.cropData
    
    const handles = [
      { x: cropX, y: cropY, cursor: 'nw-resize', position: 'tl' },
      { x: cropX + width, y: cropY, cursor: 'ne-resize', position: 'tr' },
      { x: cropX, y: cropY + height, cursor: 'sw-resize', position: 'bl' },
      { x: cropX + width, y: cropY + height, cursor: 'se-resize', position: 'br' },
      { x: cropX + width/2, y: cropY, cursor: 'n-resize', position: 't' },
      { x: cropX + width/2, y: cropY + height, cursor: 's-resize', position: 'b' },
      { x: cropX, y: cropY + height/2, cursor: 'w-resize', position: 'l' },
      { x: cropX + width, y: cropY + height/2, cursor: 'e-resize', position: 'r' }
    ]
    
    return handles.find(handle => 
      Math.abs(x - handle.x) < handleSize/2 && Math.abs(y - handle.y) < handleSize/2
    )
  }

  // 크롭 영역 내부 체크
  isInsideCropArea(x, y) {
    return x >= this.cropData.x && x <= this.cropData.x + this.cropData.width &&
           y >= this.cropData.y && y <= this.cropData.y + this.cropData.height
  }

  // 크롭 영역 리사이즈
  resizeCropArea(x, y) {
    const handle = this.cropData.handle
    
    switch(handle?.position) {
      case 'tl':
        this.cropData.width += this.cropData.x - x
        this.cropData.height += this.cropData.y - y
        this.cropData.x = x
        this.cropData.y = y
        break
      case 'tr':
        this.cropData.width = x - this.cropData.x
        this.cropData.height += this.cropData.y - y
        this.cropData.y = y
        break
      case 'bl':
        this.cropData.width += this.cropData.x - x
        this.cropData.height = y - this.cropData.y
        this.cropData.x = x
        break
      case 'br':
        this.cropData.width = x - this.cropData.x
        this.cropData.height = y - this.cropData.y
        break
      case 't':
        this.cropData.height += this.cropData.y - y
        this.cropData.y = y
        break
      case 'b':
        this.cropData.height = y - this.cropData.y
        break
      case 'l':
        this.cropData.width += this.cropData.x - x
        this.cropData.x = x
        break
      case 'r':
        this.cropData.width = x - this.cropData.x
        break
    }
    
    this.constrainCropArea()
  }

  // 크롭 적용
  async applyCrop() {
    const { x, y, width, height } = this.cropData
    const scale = this.scale || 1
    
    // 실제 이미지 좌표로 변환
    const realX = Math.floor(x / scale)
    const realY = Math.floor(y / scale)
    const realWidth = Math.floor(width / scale)
    const realHeight = Math.floor(height / scale)
    
    // 새 캔버스 생성 (실제 크기)
    const croppedCanvas = document.createElement('canvas')
    croppedCanvas.width = realWidth
    croppedCanvas.height = realHeight
    const croppedCtx = croppedCanvas.getContext('2d')
    
    // 크롭된 이미지 그리기
    croppedCtx.drawImage(
      this.image, 
      realX, realY, realWidth, realHeight, 
      0, 0, realWidth, realHeight
    )
    
    // 블롭으로 변환
    return new Promise((resolve) => {
      croppedCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        resolve({ blob, url, width: realWidth, height: realHeight })
      }, 'image/png')
    })
  }

  // 레이어 추가
  async addLayer(imageUrl, name = '새 레이어') {
    try {
      const layerImage = await this.loadImage(imageUrl)
      
      const layer = {
        id: Date.now(),
        name,
        image: layerImage,
        imageUrl,
        x: 0,
        y: 0,
        width: layerImage.width,
        height: layerImage.height,
        opacity: 1,
        visible: true,
        blendMode: 'normal'
      }
      
      this.layers.push(layer)
      this.activeLayerIndex = this.layers.length - 1
      this.drawImage()
      
      return layer
    } catch (error) {
      console.error('레이어 추가 실패:', error)
      throw error
    }
  }

  // 레이어 제거
  removeLayer(index) {
    if (index >= 0 && index < this.layers.length) {
      this.layers.splice(index, 1)
      this.activeLayerIndex = Math.min(this.activeLayerIndex, this.layers.length - 1)
      this.drawImage()
    }
  }

  // 레이어 순서 변경
  moveLayer(fromIndex, toIndex) {
    if (fromIndex >= 0 && fromIndex < this.layers.length && 
        toIndex >= 0 && toIndex < this.layers.length) {
      const [layer] = this.layers.splice(fromIndex, 1)
      this.layers.splice(toIndex, 0, layer)
      this.drawImage()
    }
  }

  // 레이어 속성 업데이트
  updateLayer(index, properties) {
    if (index >= 0 && index < this.layers.length) {
      Object.assign(this.layers[index], properties)
      this.drawImage()
    }
  }

  // 편집 모드 설정
  setEditMode(mode) {
    this.editMode = mode
    this.drawImage()
  }

  // 전체 이미지 내보내기
  async exportImage(format = 'png', quality = 1) {
    // 임시 캔버스 생성
    const exportCanvas = document.createElement('canvas')
    exportCanvas.width = this.canvas.width
    exportCanvas.height = this.canvas.height
    const exportCtx = exportCanvas.getContext('2d')
    
    // 이미지와 레이어 그리기
    exportCtx.drawImage(this.image, 0, 0)
    
    this.layers.forEach(layer => {
      if (layer.visible) {
        exportCtx.globalAlpha = layer.opacity
        exportCtx.drawImage(
          layer.image,
          layer.x,
          layer.y,
          layer.width,
          layer.height
        )
        exportCtx.globalAlpha = 1
      }
    })
    
    // 블롭으로 변환
    return new Promise((resolve) => {
      exportCanvas.toBlob((blob) => {
        const url = URL.createObjectURL(blob)
        resolve({ blob, url })
      }, `image/${format}`, quality)
    })
  }

  // 리소스 정리
  dispose() {
    this.canvas = null
    this.ctx = null
    this.image = null
    this.layers.length = 0
  }
}

// 편집기 인스턴스 생성 함수
export function createImageEditor(imageUrl) {
  return new ImageEditor(imageUrl)
}