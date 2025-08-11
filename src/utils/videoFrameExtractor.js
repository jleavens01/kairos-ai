/**
 * 비디오 프레임 추출 유틸리티
 * HTML5 Canvas API를 사용하여 비디오에서 프레임을 캡처합니다
 */

export class VideoFrameExtractor {
  constructor(videoUrl) {
    this.videoUrl = videoUrl
    this.video = null
    this.canvas = null
    this.context = null
  }

  /**
   * 비디오 엘리먼트 초기화
   */
  async initialize() {
    return new Promise((resolve, reject) => {
      // 비디오 엘리먼트 생성
      this.video = document.createElement('video')
      this.video.src = this.videoUrl
      this.video.crossOrigin = 'anonymous' // CORS 설정
      this.video.muted = true
      this.video.playsInline = true
      
      // Canvas 생성
      this.canvas = document.createElement('canvas')
      this.context = this.canvas.getContext('2d')
      
      // 메타데이터 로드 대기
      this.video.addEventListener('loadedmetadata', () => {
        // Canvas 크기를 비디오 크기와 동일하게 설정
        this.canvas.width = this.video.videoWidth
        this.canvas.height = this.video.videoHeight
        resolve()
      })
      
      this.video.addEventListener('error', (error) => {
        reject(new Error('비디오 로드 실패: ' + error.message))
      })
      
      // 비디오 로드 시작
      this.video.load()
    })
  }

  /**
   * 특정 시간의 프레임 캡처
   * @param {number} time - 캡처할 시간 (초)
   * @param {string} format - 출력 형식 ('blob' | 'dataUrl' | 'canvas')
   * @param {number} quality - JPEG 품질 (0-1)
   */
  async captureFrame(time = 0, format = 'blob', quality = 0.95) {
    if (!this.video || !this.canvas || !this.context) {
      throw new Error('VideoFrameExtractor가 초기화되지 않았습니다')
    }

    return new Promise((resolve, reject) => {
      // 특정 시간으로 이동
      this.video.currentTime = time
      
      // seeked 이벤트 대기 (시간 이동 완료)
      const handleSeeked = () => {
        try {
          // Canvas에 현재 프레임 그리기
          this.context.drawImage(
            this.video, 
            0, 
            0, 
            this.canvas.width, 
            this.canvas.height
          )
          
          // 요청된 형식으로 변환
          if (format === 'canvas') {
            resolve(this.canvas)
          } else if (format === 'dataUrl') {
            const dataUrl = this.canvas.toDataURL('image/jpeg', quality)
            resolve(dataUrl)
          } else if (format === 'blob') {
            this.canvas.toBlob(
              (blob) => {
                if (blob) {
                  resolve(blob)
                } else {
                  reject(new Error('Blob 생성 실패'))
                }
              },
              'image/jpeg',
              quality
            )
          } else {
            reject(new Error('지원하지 않는 형식: ' + format))
          }
          
          // 이벤트 리스너 제거
          this.video.removeEventListener('seeked', handleSeeked)
        } catch (error) {
          reject(error)
        }
      }
      
      this.video.addEventListener('seeked', handleSeeked)
      
      // 에러 처리
      this.video.addEventListener('error', (error) => {
        reject(new Error('프레임 캡처 실패: ' + error.message))
      }, { once: true })
    })
  }

  /**
   * 여러 프레임을 일정 간격으로 캡처
   * @param {number} interval - 프레임 간격 (초)
   * @param {number} count - 캡처할 프레임 수
   * @param {string} format - 출력 형식
   */
  async captureMultipleFrames(interval = 1, count = 5, format = 'blob') {
    const frames = []
    const duration = this.getDuration()
    
    for (let i = 0; i < count; i++) {
      const time = Math.min(i * interval, duration - 0.1)
      const frame = await this.captureFrame(time, format)
      frames.push({
        time,
        data: frame,
        index: i
      })
    }
    
    return frames
  }

  /**
   * 첫 프레임 캡처 (썸네일용)
   */
  async captureFirstFrame(format = 'blob') {
    return this.captureFrame(0.1, format) // 0.1초로 설정하여 검은 화면 방지
  }

  /**
   * 마지막 프레임 캡처
   */
  async captureLastFrame(format = 'blob') {
    const duration = this.getDuration()
    return this.captureFrame(Math.max(0, duration - 0.1), format)
  }

  /**
   * 중간 프레임 캡처
   */
  async captureMiddleFrame(format = 'blob') {
    const duration = this.getDuration()
    return this.captureFrame(duration / 2, format)
  }

  /**
   * 비디오 재생 시간 반환
   */
  getDuration() {
    if (!this.video) {
      throw new Error('비디오가 로드되지 않았습니다')
    }
    return this.video.duration
  }

  /**
   * 비디오 크기 반환
   */
  getDimensions() {
    if (!this.video) {
      throw new Error('비디오가 로드되지 않았습니다')
    }
    return {
      width: this.video.videoWidth,
      height: this.video.videoHeight
    }
  }

  /**
   * 리소스 정리
   */
  destroy() {
    if (this.video) {
      this.video.pause()
      this.video.src = ''
      this.video = null
    }
    
    if (this.canvas) {
      this.canvas = null
    }
    
    if (this.context) {
      this.context = null
    }
  }
}

/**
 * 편의 함수: 단일 프레임 빠른 캡처
 */
export async function quickCaptureFrame(videoUrl, time = 0, format = 'blob') {
  const extractor = new VideoFrameExtractor(videoUrl)
  
  try {
    await extractor.initialize()
    const frame = await extractor.captureFrame(time, format)
    return frame
  } finally {
    extractor.destroy()
  }
}

/**
 * 편의 함수: 썸네일 생성
 */
export async function generateThumbnail(videoUrl, options = {}) {
  const {
    time = 0.5, // 기본 0.5초 위치
    width = 320,
    height = 180,
    quality = 0.8
  } = options
  
  const extractor = new VideoFrameExtractor(videoUrl)
  
  try {
    await extractor.initialize()
    
    // 리사이즈용 Canvas 생성
    const resizeCanvas = document.createElement('canvas')
    resizeCanvas.width = width
    resizeCanvas.height = height
    const resizeContext = resizeCanvas.getContext('2d')
    
    // 원본 프레임 캡처
    await extractor.captureFrame(time, 'canvas')
    
    // 리사이즈
    resizeContext.drawImage(
      extractor.canvas,
      0, 0,
      extractor.canvas.width, extractor.canvas.height,
      0, 0,
      width, height
    )
    
    // Blob으로 변환
    return new Promise((resolve) => {
      resizeCanvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        quality
      )
    })
  } finally {
    extractor.destroy()
  }
}