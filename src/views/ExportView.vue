<template>
  <div class="export-view">
    <!-- 헤더 -->
    <div class="export-header">
      <h2>🎬 Premiere Pro 내보내기</h2>
      <p>TTS 기반 타임라인으로 자동 구성된 프로젝트를 Adobe Premiere Pro에서 편집하세요</p>
    </div>

    <!-- 내보낼 파일들 -->
    <div v-if="timelineData.scenes.length > 0" class="export-files">
      <div class="export-info">
        <h3>📦 내보낼 파일들</h3>
        <ul>
          <li>{{ project?.name || 'project' }}.xml (Premiere Pro 프로젝트 파일)</li>
          <li>assets/ 폴더 ({{ availableAssetsCount }}개 미디어 파일)</li>
          <li v-if="exportSettings.includeSceneScript">{{ project?.name || 'project' }}_subtitles.srt (SRT 자막 파일)</li>
          <li>project-info.json (메타데이터)</li>
          <li>README.md (사용 가이드)</li>
        </ul>
      </div>

      <div class="export-buttons">
        <button 
          @click="previewExport" 
          class="btn-secondary"
          :disabled="exporting"
        >
          미리보기
        </button>
        <button 
          @click="startExport" 
          class="btn-primary export-btn"
          :disabled="exporting"
        >
          <span v-if="exporting" class="loading-spinner-small"></span>
          {{ exporting ? '내보내는 중...' : 'Premiere Pro로 내보내기' }}
        </button>
      </div>
    </div>

    <!-- 내보내기 설정 -->
    <div v-if="timelineData.scenes.length > 0" class="export-settings">
      <h3>⚙️ 내보내기 설정</h3>
      
      <div class="settings-grid">
        <div class="setting-group">
          <h4>비디오 트림 방식</h4>
          <div class="radio-group">
            <label>
              <input type="radio" v-model="exportSettings.videoTrimMode" value="start" />
              앞부분 사용 (TTS 길이만큼)
            </label>
            <label>
              <input type="radio" v-model="exportSettings.videoTrimMode" value="center" />
              중간부분 사용
            </label>
            <label>
              <input type="radio" v-model="exportSettings.videoTrimMode" value="smart" />
              스마트 트림 (자동 최적화)
            </label>
          </div>
        </div>

        <div class="setting-group">
          <h4>이미지 처리</h4>
          <div class="checkbox-group">
            <label>
              <input type="checkbox" v-model="exportSettings.enableKenBurns" />
              켄 번즈 효과 적용 (이미지 확대/축소)
            </label>
            <label>
              <input type="checkbox" v-model="exportSettings.imageToVideo" />
              이미지를 비디오로 변환
            </label>
          </div>
        </div>

        <div class="setting-group">
          <h4>프로젝트 설정</h4>
          <div class="input-group">
            <label>프로젝트 이름</label>
            <input 
              type="text" 
              v-model="exportSettings.projectName" 
              :placeholder="project?.name || 'Untitled Project'"
            />
          </div>
          <div class="input-group">
            <label>해상도</label>
            <select v-model="exportSettings.resolution">
              <option value="1920x1080">1920x1080 (Full HD 가로)</option>
              <option value="1080x1920">1080x1920 (Full HD 세로)</option>
              <option value="3840x2160">3840x2160 (4K 가로)</option>
              <option value="2160x3840">2160x3840 (4K 세로)</option>
              <option value="1280x720">1280x720 (HD 가로)</option>
              <option value="720x1280">720x1280 (HD 세로)</option>
            </select>
          </div>
          <div class="input-group">
            <label>자막 옵션</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="exportSettings.includeSceneScript"
                />
                씬별 오리지널 스크립트 자막
              </label>
            </div>
            
            <!-- 자막 분할 옵션 -->
            <div v-if="exportSettings.includeSceneScript" class="subtitle-split-options">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="exportSettings.splitSubtitles"
                />
                긴 자막을 짧게 분할
              </label>
              
              <div v-if="exportSettings.splitSubtitles" class="split-settings">
                <div class="input-row">
                  <label for="targetCharsPerLine">희망 평균 글자 수:</label>
                  <input 
                    id="targetCharsPerLine"
                    type="number" 
                    v-model.number="exportSettings.targetCharsPerLine"
                    min="10" 
                    max="50" 
                    class="number-input"
                  />
                  <span class="input-hint">글자 (10-50자 권장)</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 제목 트랙 설정 -->
          <div class="input-group">
            <label>제목 트랙</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="exportSettings.includeTitleTrack"
                />
                제목 텍스트 트랙 추가
              </label>
              <div v-if="exportSettings.includeTitleTrack" class="sub-options">
                <div class="input-group">
                  <label>제목 텍스트</label>
                  <input
                    type="text"
                    v-model="exportSettings.titleText"
                    :placeholder="project?.name || '제목을 입력하세요'"
                    class="input-field"
                  />
                </div>
                <div class="input-group">
                  <label>제목 위치</label>
                  <select v-model="exportSettings.titlePosition">
                    <option value="0.1">상단</option>
                    <option value="0.5">중앙</option>
                    <option value="0.9">하단</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          <!-- 로고 트랙 설정 -->
          <div class="input-group">
            <label>로고 트랙</label>
            <div class="checkbox-group">
              <label class="checkbox-label">
                <input 
                  type="checkbox" 
                  v-model="exportSettings.includeLogoTrack"
                />
                로고 이미지 트랙 추가
              </label>
              <div v-if="exportSettings.includeLogoTrack" class="sub-options">
                <div class="input-group">
                  <label>로고 이미지</label>
                  <div class="logo-upload-section">
                    <input
                      type="file"
                      ref="logoFileInput"
                      accept="image/*"
                      @change="handleLogoUpload"
                      style="display: none"
                    />
                    <button 
                      type="button" 
                      @click="$refs.logoFileInput.click()"
                      class="btn-secondary upload-btn"
                    >
                      {{ exportSettings.logoFile ? '로고 변경' : '로고 업로드' }}
                    </button>
                    <span v-if="exportSettings.logoFile" class="logo-filename">
                      {{ exportSettings.logoFile.name }}
                    </span>
                  </div>
                </div>
                <div class="input-group">
                  <label>로고 위치</label>
                  <select v-model="exportSettings.logoPosition">
                    <option value="top-left">좌상단</option>
                    <option value="top-right">우상단</option>
                    <option value="bottom-left">좌하단</option>
                    <option value="bottom-right">우하단</option>
                    <option value="center">중앙</option>
                  </select>
                </div>
                <div class="input-group">
                  <label>로고 크기</label>
                  <select v-model="exportSettings.logoSize">
                    <option value="small">작게 (10%)</option>
                    <option value="medium">보통 (20%)</option>
                    <option value="large">크게 (30%)</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
          <div class="input-group">
            <label>프레임레이트</label>
            <select v-model="exportSettings.frameRate">
              <option value="24">24 fps</option>
              <option value="30">30 fps</option>
              <option value="60">60 fps</option>
            </select>
          </div>
        </div>
      </div>
    </div>

    <!-- 타임라인 미리보기 -->
    <div class="timeline-preview">
      <h3>📊 타임라인 구조 미리보기</h3>
      
      <!-- 로딩 상태 -->
      <div v-if="timelineLoading" class="timeline-loading">
        <div class="loading-spinner"></div>
        <p>타임라인 분석 중...</p>
      </div>

      <!-- 타임라인 데이터가 있을 때 -->
      <div v-else-if="timelineData.scenes.length > 0" class="timeline-container">
        <!-- 타임라인 총 정보 -->
        <div class="timeline-summary">
          <div class="summary-card">
            <h4>총 재생 시간</h4>
            <span class="duration">{{ formatDuration(timelineData.totalDuration) }}</span>
          </div>
          <div class="summary-card">
            <h4>총 씬 수</h4>
            <span class="count">{{ timelineData.scenes.length }}개</span>
          </div>
          <div class="summary-card">
            <h4>사용 가능한 에셋</h4>
            <span class="assets">{{ availableAssetsCount }}개</span>
          </div>
        </div>

        <!-- 트랙별 타임라인 시각화 -->
        <div class="timeline-tracks">
          <!-- Audio Track (TTS) -->
          <div class="track audio-track">
            <div class="track-header">
              <h4>🎵 Audio Track (TTS)</h4>
            </div>
            <div class="track-content">
              <div 
                v-for="(scene, index) in timelineData.scenes" 
                :key="`audio-${scene.sceneId}`"
                class="timeline-segment audio-segment"
                :style="{ width: `${(scene.duration / timelineData.totalDuration) * 100}%` }"
                :title="`씬 ${scene.sceneNumber}: ${formatDuration(scene.duration)}`"
              >
                <span class="segment-label">씬 {{ scene.sceneNumber }}</span>
                <span class="segment-duration">{{ formatDuration(scene.duration) }}</span>
              </div>
            </div>
          </div>

          <!-- Video Track -->
          <div class="track video-track">
            <div class="track-header">
              <h4>🎥 Video Track</h4>
            </div>
            <div class="track-content">
              <div 
                v-for="(scene, index) in timelineData.scenes" 
                :key="`video-${scene.sceneId}`"
                class="timeline-segment video-segment"
                :style="{ width: `${(scene.duration / timelineData.totalDuration) * 100}%` }"
                :class="{ 
                  'has-video': scene.hasVideo, 
                  'has-image': scene.hasImage && !scene.hasVideo,
                  'no-media': !scene.hasVideo && !scene.hasImage,
                  'upscaled': scene.hasVideo && scene.isUpscaled
                }"
                :title="getVideoSegmentTitle(scene)"
              >
                <span class="segment-label">
                  {{ scene.hasVideo ? (scene.isUpscaled ? '🎥✨' : '🎥') : scene.hasImage ? '🖼️' : '❌' }}
                  씬 {{ scene.sceneNumber }}
                </span>
                <span class="segment-duration">{{ formatDuration(scene.duration) }}</span>
              </div>
            </div>
          </div>

          <!-- Caption Track (향후 자막) -->
          <div class="track caption-track">
            <div class="track-header">
              <h4>💬 Caption Track (향후 추가 예정)</h4>
            </div>
            <div class="track-content disabled">
              <div 
                v-for="(scene, index) in timelineData.scenes" 
                :key="`caption-${scene.sceneId}`"
                class="timeline-segment caption-segment disabled"
                :style="{ width: `${(scene.duration / timelineData.totalDuration) * 100}%` }"
              >
                <span class="segment-label">자막 {{ scene.sceneNumber }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 씬 상세 정보 -->
        <div class="scenes-detail">
          <h4>씬별 상세 정보</h4>
          <div class="scenes-list">
            <div 
              v-for="scene in timelineData.scenes" 
              :key="scene.sceneId"
              class="scene-item"
              :class="{ 'incomplete': !scene.hasVideo && !scene.hasImage || !scene.hasTTS }"
            >
              <div class="scene-header">
                <span class="scene-number">씬 {{ scene.sceneNumber }}</span>
                <span class="scene-time">{{ formatTime(scene.startTime) }} → {{ formatTime(scene.endTime) }}</span>
              </div>
              <div class="scene-assets">
                <div class="asset-status" :class="{ available: scene.hasTTS }">
                  🎵 TTS: {{ scene.hasTTS ? '사용 가능' : '없음' }}
                </div>
                <div class="asset-status" :class="{ 
                  available: scene.hasVideo,
                  upscaled: scene.hasVideo && scene.isUpscaled 
                }">
                  🎥 비디오: {{ getVideoStatusText(scene) }}
                </div>
                <div class="asset-status" :class="{ available: scene.hasImage }">
                  🖼️ 이미지: {{ scene.hasImage ? '사용 가능' : '없음' }}
                </div>
              </div>
              <div class="scene-script">
                {{ scene.script || '스크립트 없음' }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 에셋이 없을 때 -->
      <div v-else class="no-timeline">
        <div class="no-timeline-icon">📝</div>
        <h3>스토리보드가 없습니다</h3>
        <p>내보내기를 위해서는 먼저 스토리보드 탭에서 씬을 생성하고 TTS를 생성해주세요.</p>
        <button @click="$emit('switch-tab', 'production')" class="btn-primary">
          스토리보드로 이동
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useProductionStore } from '@/stores/production'
import { supabase } from '@/utils/supabase'
import JSZip from 'jszip'

const props = defineProps({
  projectId: {
    type: String,
    required: true
  },
  project: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['switch-tab'])

const productionStore = useProductionStore()

// 상태 관리
const timelineLoading = ref(true)
const exporting = ref(false)
const timelineData = ref({
  totalDuration: 0,
  scenes: []
})

// 내보내기 설정
const exportSettings = ref({
  videoTrimMode: 'start',
  enableKenBurns: true,
  imageToVideo: false,
  projectName: '',
  resolution: '1920x1080',
  frameRate: '24',
  includeSceneScript: true,  // 씬별 오리지널 스크립트 자막
  splitSubtitles: false,     // 자막 분할 옵션
  targetCharsPerLine: 25,    // 희망 평균 글자 수
  includeTitleTrack: false,  // 제목 텍스트 트랙
  titleText: '',             // 제목 텍스트
  titlePosition: '0.1',      // 제목 위치 (상단)
  includeLogoTrack: false,   // 로고 이미지 트랙
  logoFile: null,            // 업로드된 로고 파일
  logoPosition: 'top-right', // 로고 위치
  logoSize: 'medium'         // 로고 크기
})

// 로고 업로드 핸들러
const handleLogoUpload = (event) => {
  const file = event.target.files[0]
  if (file) {
    // 이미지 파일 유효성 검사
    if (!file.type.startsWith('image/')) {
      alert('이미지 파일만 업로드 가능합니다.')
      return
    }
    
    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('파일 크기는 5MB 이하만 가능합니다.')
      return
    }
    
    exportSettings.value.logoFile = file
  }
}

// 컴포넌트 마운트 시 타임라인 데이터 로드
onMounted(() => {
  loadTimelineData()
  exportSettings.value.projectName = props.project?.name || ''
  exportSettings.value.titleText = props.project?.name || ''
})

// 프로젝트 변경 시 데이터 다시 로드
watch(() => props.projectId, () => {
  loadTimelineData()
})

// 타임라인 데이터 로드
const loadTimelineData = async () => {
  timelineLoading.value = true
  
  try {
    // 프로덕션 시트 데이터 가져오기
    const productionSheets = await productionStore.fetchProductionSheets(props.projectId)
    
    // TTS 데이터 가져오기
    const { data: ttsData } = await supabase
      .from('tts_audio')
      .select('scene_id, file_url, duration, version')
      .in('scene_id', productionSheets.map(s => s.id))
      .order('version', { ascending: false })
    
    // 씬별 비디오 데이터 가져오기 (업스케일 비디오 포함)
    // 비디오 데이터 조회 시작
    
    let { data: videoData, error: videoError } = await supabase
      .from('gen_videos')
      .select('id, production_sheet_id, storage_video_url, upscale_video_url, upscale_status, upscale_factor, created_at')
      .in('production_sheet_id', productionSheets.map(s => s.id))
      .order('created_at', { ascending: false })
    
    // 디버깅: 현재 프로젝트의 gen_videos 데이터 확인
    const { data: projectVideos, error: projectVideosError } = await supabase
      .from('gen_videos')
      .select('*')
      .eq('project_id', props.projectId)
    
    if (projectVideos && projectVideos.length > 0) {
      // 업스케일 비디오 통계 확인
      
      // 자동 연결 시도: scene_video_url과 storage_video_url이 일치하는 경우 자동 연결
      const unlinkedVideos = projectVideos.filter(v => !v.production_sheet_id && v.storage_video_url)
      // 연결되지 않은 비디오 처리
      
      for (const video of unlinkedVideos) {
        // scene_video_url과 일치하는 production_sheet 찾기
        const matchingSheet = productionSheets.find(sheet => 
          sheet.scene_video_url === video.storage_video_url
        )
        
        console.log(`연결되지 않은 비디오 처리:`, {
          videoId: video.id,
          storageUrl: video.storage_video_url,
          matchingSheetFound: !!matchingSheet,
          matchingSheetSceneNumber: matchingSheet?.scene_number
        })
        
        
        if (matchingSheet) {
          console.log(`비디오 ${video.id}를 씬 ${matchingSheet.scene_number}에 자동 연결 시도`)
          
          try {
            const { error: linkError } = await supabase
              .from('gen_videos')
              .update({ 
                production_sheet_id: matchingSheet.id,
                updated_at: new Date().toISOString()
              })
              .eq('id', video.id)
            
            if (!linkError) {
              console.log(`✅ 비디오 ${video.id} 자동 연결 성공`)
              // 연결된 비디오는 다시 조회할 때 포함될 것임
            } else {
              console.error('자동 연결 실패:', linkError)
            }
          } catch (error) {
            console.error('자동 연결 에러:', error)
          }
        } else {
          // 매칭되는 시트를 찾지 못한 경우 디버깅
          console.log(`매칭 실패 - 비디오 storage_video_url: ${video.storage_video_url}`)
          console.log('사용 가능한 scene_video_url들:', productionSheets.map(s => ({
            sceneNumber: s.scene_number,
            sceneVideoUrl: s.scene_video_url
          })))
        }
      }
      
      // 자동 연결 후 다시 조회
      if (unlinkedVideos.length > 0) {
        console.log('자동 연결 후 다시 조회...')
        const { data: updatedVideoData } = await supabase
          .from('gen_videos')
          .select('id, production_sheet_id, storage_video_url, upscale_video_url, upscale_status, upscale_factor, created_at')
          .in('production_sheet_id', productionSheets.map(s => s.id))
          .order('created_at', { ascending: false })
        
        if (updatedVideoData) {
          console.log('자동 연결 후 조회 결과:', updatedVideoData.length, '개')
          console.log('자동 연결 후 데이터:', updatedVideoData)
          // videoData를 새로운 데이터로 교체
          videoData = updatedVideoData
          console.log('최종 videoData 길이:', videoData?.length || 0)
        }
      }
    }
    
    console.log('비디오 데이터 조회 결과:', {
      totalVideos: videoData?.length || 0,
      videoData: videoData,
      error: videoError
    })
    
    if (videoError) {
      console.error('비디오 데이터 조회 실패:', videoError)
      // 비디오 데이터를 가져오지 못해도 TTS와 이미지로 진행
    }
    
    // 각 씬의 최신 TTS 찾기
    const latestTTSByScene = {}
    if (ttsData) {
      ttsData.forEach(tts => {
        if (!latestTTSByScene[tts.scene_id] || tts.version > latestTTSByScene[tts.scene_id].version) {
          latestTTSByScene[tts.scene_id] = tts
        }
      })
    }
    
    // 각 씬의 최적 비디오 찾기 (업스케일된 비디오 우선)
    const bestVideoByScene = {}
    if (videoData && videoData.length > 0) {
      // 비디오 선택 로직 시작
      
      // 씬별로 비디오 그룹화
      const videosByScene = {}
      videoData.forEach(video => {
        if (!videosByScene[video.production_sheet_id]) {
          videosByScene[video.production_sheet_id] = []
        }
        videosByScene[video.production_sheet_id].push(video)
      })
      
      // 각 씬에서 최적의 비디오 선택
      Object.keys(videosByScene).forEach(sceneId => {
        const sceneVideos = videosByScene[sceneId]
        console.log(`씬 ${sceneId}의 비디오 후보:`, sceneVideos.map(v => ({
          id: v.id,
          hasUpscale: !!v.upscale_video_url,
          upscaleStatus: v.upscale_status,
          upscaleFactor: v.upscale_factor,
          hasStorage: !!v.storage_video_url
        })))
        
        // 1. 완료된 업스케일 비디오 우선
        let bestVideo = sceneVideos.find(v => 
          v.upscale_video_url && v.upscale_status === 'completed'
        )
        
        // 2. 업스케일이 없으면 원본 비디오
        if (!bestVideo) {
          bestVideo = sceneVideos.find(v => v.storage_video_url)
        }
        
        // 3. 둘 다 없으면 첫 번째 비디오
        if (!bestVideo) {
          bestVideo = sceneVideos[0]
        }
        
        bestVideoByScene[sceneId] = bestVideo
        console.log(`씬 ${sceneId} 최종 선택:`, {
          videoId: bestVideo.id,
          hasUpscale: !!bestVideo.upscale_video_url,
          upscaleStatus: bestVideo.upscale_status,
          factor: bestVideo.upscale_factor,
          upscaleUrl: bestVideo.upscale_video_url ? 'YES' : 'NO',
          storageUrl: bestVideo.storage_video_url ? 'YES' : 'NO'
        })
      })
    } else {
      console.warn('비디오 데이터가 없습니다')
    }

    // 타임라인 구성
    let currentTime = 0
    const scenes = []
    
    for (const sheet of productionSheets.sort((a, b) => a.scene_number - b.scene_number)) {
      const tts = latestTTSByScene[sheet.id]
      const video = bestVideoByScene[sheet.id]
      const duration = tts?.duration || 5 // 기본 5초
      
      // 비디오 URL 결정 (업스케일된 비디오 우선)
      let videoUrl = null
      let isUpscaled = false
      let upscaleFactor = null
      
      if (video) {
        // 업스케일된 비디오가 완료되었으면 우선 사용
        if (video.upscale_video_url && video.upscale_status === 'completed') {
          videoUrl = video.upscale_video_url
          isUpscaled = true
          upscaleFactor = video.upscale_factor
        }
        // 업스케일된 비디오가 없으면 원본 비디오 사용
        else if (video.storage_video_url) {
          videoUrl = video.storage_video_url
          isUpscaled = false
          upscaleFactor = null
        }
      }
      
      // gen_videos에서 비디오를 찾지 못했을 때만 scene_video_url 폴백 사용
      if (!videoUrl && sheet.scene_video_url) {
        videoUrl = sheet.scene_video_url
        isUpscaled = false
        upscaleFactor = null
      }
      
      console.log(`씬 ${sheet.scene_number}: 최종 비디오 URL 결정`, {
        hasVideo: !!video,
        upscaleUrl: video?.upscale_video_url ? 'YES' : 'NO',
        storageUrl: video?.storage_video_url ? 'YES' : 'NO',
        sceneUrl: sheet.scene_video_url ? 'YES' : 'NO',
        finalUrl: videoUrl,
        isUpscaled,
        upscaleFactor,
        // 추가 디버깅 정보
        sheetId: sheet.id,
        videoFound: video ? video.id : 'NOT_FOUND',
        videoDataInBestVideoByScene: !!bestVideoByScene[sheet.id]
      })
      
      // 특정 씬의 상세 디버깅 (씬 7번)
      if (sheet.scene_number === 7) {
        console.log('=== 씬 7번 상세 디버깅 ===')
        console.log('sheet.id:', sheet.id)
        console.log('sheet.scene_video_url:', sheet.scene_video_url)
        console.log('bestVideoByScene[sheet.id]:', bestVideoByScene[sheet.id])
        console.log('videoData 전체 길이:', videoData?.length || 0)
        
        // 이 씬과 일치하는 비디오가 있는지 수동 검색
        const matchingVideos = videoData?.filter(v => v.production_sheet_id === sheet.id) || []
        console.log('씬 7과 일치하는 비디오들:', matchingVideos)
        
        if (matchingVideos.length > 0) {
          console.log('일치하는 비디오 중 업스케일된 것:', matchingVideos.filter(v => v.upscale_video_url))
        }
      }
      
      // 스크립트 텍스트 확인
      const scriptText = sheet.original_script_text || sheet.script_text || sheet.script || ''
      console.log(`씬 ${sheet.scene_number} 스크립트 데이터:`, {
        original_script_text: sheet.original_script_text,
        script_text: sheet.script_text,
        script: sheet.script,
        finalScript: scriptText
      })

      scenes.push({
        sceneId: sheet.id,
        sceneNumber: sheet.scene_number,
        startTime: currentTime,
        endTime: currentTime + duration,
        duration: duration,
        script: scriptText,
        hasTTS: !!tts,
        hasVideo: !!videoUrl,
        hasImage: !!sheet.scene_image_url,
        ttsUrl: tts?.file_url,
        videoUrl: videoUrl,
        imageUrl: sheet.scene_image_url,
        isUpscaled: isUpscaled,
        upscaleFactor: upscaleFactor
      })
      
      currentTime += duration
    }
    
    timelineData.value = {
      totalDuration: currentTime,
      scenes
    }
  } catch (error) {
    console.error('타임라인 데이터 로드 실패:', error)
    timelineData.value = { totalDuration: 0, scenes: [] }
  } finally {
    timelineLoading.value = false
  }
}

// 사용 가능한 에셋 개수
const availableAssetsCount = computed(() => {
  return timelineData.value.scenes.reduce((count, scene) => {
    if (scene.hasTTS) count++
    if (scene.hasVideo) count++
    if (scene.hasImage) count++
    return count
  }, 0)
})

// 시간 포맷팅 함수들
const formatDuration = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

const formatTime = (seconds) => {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 비디오 세그먼트 제목
const getVideoSegmentTitle = (scene) => {
  if (scene.hasVideo) {
    const upscaleText = scene.isUpscaled ? ` (업스케일 ${scene.upscaleFactor})` : ''
    return `씬 ${scene.sceneNumber}: 비디오${upscaleText} (${formatDuration(scene.duration)})`
  } else if (scene.hasImage) {
    return `씬 ${scene.sceneNumber}: 이미지 (${formatDuration(scene.duration)})`
  } else {
    return `씬 ${scene.sceneNumber}: 미디어 없음`
  }
}

// 비디오 상태 텍스트
const getVideoStatusText = (scene) => {
  if (!scene.hasVideo) {
    return '없음'
  }
  
  if (scene.isUpscaled) {
    return `✨ 업스케일 사용 가능 (${scene.upscaleFactor})`
  } else {
    return '사용 가능'
  }
}

// 미리보기
const previewExport = () => {
  // TODO: 미리보기 기능 구현
  alert('미리보기 기능은 준비 중입니다.')
}

// 내보내기 실행
const startExport = async () => {
  exporting.value = true
  
  try {
    // 1. Premiere Pro XML 생성
    const premiereXml = generatePremiereXML()
    
    // 2. 프로젝트 정보 JSON 생성
    const projectInfo = generateProjectInfo()
    
    // 3. README 파일 생성
    const readme = generateReadme()
    
    // 4. ZIP 파일 생성 및 다운로드
    await createAndDownloadZip(premiereXml, projectInfo, readme)
    
  } catch (error) {
    console.error('내보내기 실패:', error)
    alert(`내보내기에 실패했습니다: ${error.message}`)
  } finally {
    exporting.value = false
  }
}

// Premiere Pro XML 생성 함수 (XMEML v5 표준)
const generatePremiereXML = () => {
  const projectName = exportSettings.value.projectName || props.project?.name || 'Untitled Project'
  const resolution = exportSettings.value.resolution.split('x')
  const width = parseInt(resolution[0])
  const height = parseInt(resolution[1])
  const frameRate = parseInt(exportSettings.value.frameRate)
  
  const scenes = timelineData.value.scenes
  
  // 미디어 파일 정보 수집
  const mediaFiles = []
  let fileId = 1
  
  scenes.forEach(scene => {
    if (scene.hasTTS) {
      mediaFiles.push({
        id: `file-${fileId++}`,
        name: `scene${scene.sceneNumber}-tts.mp3`,
        pathurl: `assets/audio/scene${scene.sceneNumber}-tts.mp3`,
        duration: Math.round(scene.duration * frameRate),
        type: 'audio',
        samplerate: 48000,
        depth: 16
      })
    }
    if (scene.hasVideo) {
      const upscaleTag = scene.isUpscaled ? `-upscaled-${scene.upscaleFactor || '4x'}` : ''
      mediaFiles.push({
        id: `file-${fileId++}`,
        name: `scene${scene.sceneNumber}-video${upscaleTag}.mp4`,
        pathurl: `assets/videos/scene${scene.sceneNumber}-video${upscaleTag}.mp4`,
        duration: Math.round(scene.duration * frameRate),
        type: 'video',
        width: width,
        height: height
      })
    }
    if (scene.hasImage && !scene.hasVideo) {
      mediaFiles.push({
        id: `file-${fileId++}`,
        name: `scene${scene.sceneNumber}-image.jpg`,
        pathurl: `assets/images/scene${scene.sceneNumber}-image.jpg`,
        duration: Math.round(scene.duration * frameRate),
        type: 'video', // 이미지도 비디오 트랙으로 처리
        width: width,
        height: height
      })
    }
  })

  // XML 미디어 섹션 생성
  const mediaXml = mediaFiles.map(file => {
    if (file.type === 'audio') {
      return `    <file id="${file.id}">
      <name>${file.name}</name>
      <pathurl>file://localhost/${file.pathurl}</pathurl>
      <rate>
        <timebase>${frameRate}</timebase>
      </rate>
      <duration>${file.duration}</duration>
      <media>
        <audio>
          <samplerate>${file.samplerate}</samplerate>
          <depth>${file.depth}</depth>
        </audio>
      </media>
    </file>`
    } else {
      return `    <file id="${file.id}">
      <name>${file.name}</name>
      <pathurl>file://localhost/${file.pathurl}</pathurl>
      <rate>
        <timebase>${frameRate}</timebase>
      </rate>
      <duration>${file.duration}</duration>
      <media>
        <video>
          <samplecharacteristics>
            <rate>
              <timebase>${frameRate}</timebase>
            </rate>
            <width>${file.width}</width>
            <height>${file.height}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
          </samplecharacteristics>
        </video>
      </media>
    </file>`
    }
  }).join('\n')

  // 간단한 ID 생성 함수 (크래시 방지)
  let simpleIdCounter = 1000
  const generateSimpleId = () => {
    return `id-${simpleIdCounter++}-${Date.now()}`
  }
  
  // 기존 호환성을 위한 별칭
  const generateUUID = generateSimpleId

  // SRT 자막 파일 생성 함수
  const generateSRTSubtitle = (scenes) => {
    let srtContent = ''
    let subtitleIndex = 1
    let currentTime = 0
    
    scenes.forEach((scene, index) => {
      if (scene.script && scene.script.trim()) {
        // 시간 포맷: HH:MM:SS,mmm
        const startTime = formatSRTTime(currentTime)
        const endTime = formatSRTTime(currentTime + scene.duration)
        
        srtContent += `${subtitleIndex}\n`
        srtContent += `${startTime} --> ${endTime}\n`
        srtContent += `${scene.script.trim()}\n\n`
        
        subtitleIndex++
      }
      currentTime += scene.duration
    })
    
    return srtContent
  }
  
  // SRT 시간 포맷 변환 (초 → HH:MM:SS,mmm)
  const formatSRTTime = (seconds) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)
    const milliseconds = Math.floor((seconds % 1) * 1000)
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
  }

  // Premiere Pro Essential Graphics 텍스트 템플릿 생성
  const createPremiereTextData = (text) => {
    if (!text) return ''
    
    try {
      // 사용자가 제공한 실제 Premiere Pro XML 구조를 참고하여 구현
      // parameterid="1" (Source Text)의 Base64 값을 역분석한 템플릿
      
      console.log('생성할 텍스트:', text)
      
      // 1. Essential Graphics 시그니처 및 메타데이터
      const signature = new Uint8Array([
        0x00, 0x80, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // Essential Graphics 시그니처
        0x44, 0x33, 0x22, 0x11, 0x0C, 0x00, 0x00, 0x00, // 버전 및 포맷 정보  
        0x00, 0x00, 0x00, 0x00, 0x06, 0x00, 0x0A, 0x00, // 구조 플래그
        0x04, 0x00, 0x06, 0x00, 0x00, 0x00, 0x64, 0x00  // 기본 설정
      ])
      
      // 2. 텍스트 콘텐츠를 UTF-16LE로 인코딩
      const textUtf16 = []
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i)
        textUtf16.push(code & 0xFF, (code >> 8) & 0xFF)
      }
      
      // 3. 텍스트 섹션 헤더 (길이 정보 포함)
      const textHeader = new Uint8Array(8)
      const textLength = textUtf16.length
      textHeader[0] = textLength & 0xFF
      textHeader[1] = (textLength >> 8) & 0xFF
      textHeader[2] = (textLength >> 16) & 0xFF  
      textHeader[3] = (textLength >> 24) & 0xFF
      textHeader[4] = 0x01 // 텍스트 플래그
      textHeader[5] = 0x00
      textHeader[6] = 0x00
      textHeader[7] = 0x00
      
      // 4. 스타일 정보 (폰트, 크기, 색상 등)
      const styleSection = new Uint8Array([
        // 폰트 크기 (48pt = 0x30)
        0x00, 0x00, 0x30, 0x00, 0x00, 0x00, 0x00, 0x00,
        
        // 텍스트 색상 (흰색 RGBA)
        0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00,
        
        // 정렬 및 위치 (중앙 정렬)
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        
        // 텍스트 효과 설정
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00
      ])
      
      // 5. 종료 시그니처
      const footer = new Uint8Array([
        0x00, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00,
        0xFF, 0xFF, 0xFF, 0xFF, 0x00, 0x00, 0x00, 0x00
      ])
      
      // 모든 섹션 결합
      const totalSize = signature.length + textHeader.length + textUtf16.length + styleSection.length + footer.length
      const finalData = new Uint8Array(totalSize)
      
      let offset = 0
      finalData.set(signature, offset)
      offset += signature.length
      
      finalData.set(textHeader, offset)
      offset += textHeader.length
      
      finalData.set(new Uint8Array(textUtf16), offset)
      offset += textUtf16.length
      
      finalData.set(styleSection, offset)
      offset += styleSection.length
      
      finalData.set(footer, offset)
      
      // Base64로 인코딩
      const binary = Array.from(finalData).map(byte => String.fromCharCode(byte)).join('')
      const base64Result = btoa(binary)
      
      console.log('생성된 Base64 길이:', base64Result.length)
      return base64Result
      
    } catch (error) {
      console.error('Premiere Pro 텍스트 데이터 생성 실패:', error)
      
      // 폴백: 간단한 UTF-8 Base64 인코딩
      try {
        return btoa(unescape(encodeURIComponent(text)))
      } catch (fallbackError) {
        console.error('폴백 인코딩도 실패:', fallbackError)
        return btoa(text) // 최후의 수단
      }
    }
  }
  
  // 템플릿 기반 텍스트 교체 (가장 안전한 방법)
  const replaceTextInTemplate = (text, templateBase64) => {
    try {
      // 실제 Premiere Pro XML에서 추출한 Base64 템플릿에서 텍스트 부분만 교체
      // 이 방법이 가장 안전하고 확실함
      
      if (!templateBase64) {
        return createPremiereTextData(text)
      }
      
      // Base64를 바이너리로 디코딩
      const binaryString = atob(templateBase64)
      const templateBytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        templateBytes[i] = binaryString.charCodeAt(i)
      }
      
      // 새 텍스트를 UTF-16LE로 변환
      const newTextUtf16 = []
      for (let i = 0; i < text.length; i++) {
        const code = text.charCodeAt(i)
        newTextUtf16.push(code & 0xFF, (code >> 8) & 0xFF)
      }
      
      // 템플릿에서 텍스트 부분을 찾아서 교체
      // (실제로는 매우 복잡하지만, 길이가 비슷한 경우 시도해볼 수 있음)
      
      // 길이 차이가 크면 새로 생성
      if (Math.abs(newTextUtf16.length - 100) > 50) { // 임시 임계값
        console.log('텍스트 길이 차이가 커서 새로 생성')
        return createPremiereTextData(text)
      }
      
      // 템플릿 사용이 어려우면 새로 생성
      return createPremiereTextData(text)
      
    } catch (error) {
      console.error('템플릿 기반 텍스트 교체 실패:', error)
      return createPremiereTextData(text)
    }
  }
  
  // 임시로 Base64 인코딩을 비활성화하여 XML 구조 안정화
  const encodeTextForPremiere = (text) => {
    // 크래시 방지를 위해 복잡한 인코딩 비활성화
    // 일단 XML 구조가 안정되면 다시 활성화
    // 텍스트 인코딩 비활성화
    return '' // 빈 값으로 반환하여 구조만 확인
  }

  // 클립 생성 (실제 Premiere Pro 형식)
  let clipId = 1
  fileId = 1 // 기존 fileId를 재설정
  const videoTracks = []
  const audioTrackClips = []
  // 자막과 제목 트랙 제거 (SRT 파일로 대체)
  const logoTrack = []      // 로고 이미지 트랙
  let currentFrame = 0
  
  // 비디오 트랙 생성
  const videoTrack = []
  
  scenes.forEach((scene, index) => {
    const sceneDurationFrames = Math.round(scene.duration * frameRate)
    const pproTicksIn = 0
    const pproTicksOut = sceneDurationFrames * 8475667200 / frameRate
    
    if (scene.hasVideo) {
      const videoFile = mediaFiles.find(f => f.name.includes(`scene${scene.sceneNumber}-video`))
      if (videoFile) {
        // 업스케일 표시를 파일명에 반영
        const displayName = scene.isUpscaled ? 
          `${videoFile.name.replace('.mp4', '')}_upscaled-${scene.upscaleFactor || '4x'}.mp4` : 
          videoFile.name
        videoTrack.push(`        <clipitem id="clipitem-${clipId++}">
          <masterclipid>masterclip-${fileId}</masterclipid>
          <name>${displayName}</name>
          <enabled>TRUE</enabled>
          <duration>${sceneDurationFrames}</duration>
          <rate>
            <timebase>${frameRate}</timebase>
            <ntsc>TRUE</ntsc>
          </rate>
          <start>${currentFrame}</start>
          <end>${currentFrame + sceneDurationFrames}</end>
          <in>0</in>
          <out>${sceneDurationFrames}</out>
          <pproTicksIn>${pproTicksIn}</pproTicksIn>
          <pproTicksOut>${pproTicksOut}</pproTicksOut>
          <alphatype>none</alphatype>
          <pixelaspectratio>square</pixelaspectratio>
          <anamorphic>FALSE</anamorphic>
          <file id="file-${fileId++}">
            <name>${videoFile.name}</name>
            <pathurl>file://localhost/${videoFile.pathurl}</pathurl>
            <rate>
              <timebase>24</timebase>
              <ntsc>FALSE</ntsc>
            </rate>
            <duration>${Math.round(sceneDurationFrames * 24 / frameRate)}</duration>
            <timecode>
              <rate>
                <timebase>24</timebase>
                <ntsc>FALSE</ntsc>
              </rate>
              <string>00:00:00:00</string>
              <frame>0</frame>
              <displayformat>NDF</displayformat>
            </timecode>
            <media>
              <video>
                <samplecharacteristics>
                  <rate>
                    <timebase>24</timebase>
                    <ntsc>FALSE</ntsc>
                  </rate>
                  <width>1600</width>
                  <height>1600</height>
                  <anamorphic>FALSE</anamorphic>
                  <pixelaspectratio>square</pixelaspectratio>
                  <fielddominance>none</fielddominance>
                </samplecharacteristics>
              </video>
            </media>
          </file>
          <logginginfo>
            <description/>
            <scene/>
            <shottake/>
            <lognote/>
            <good/>
            <originalvideofilename/>
            <originalaudiofilename/>
          </logginginfo>
          <colorinfo>
            <lut/>
            <lut1/>
            <asc_sop/>
            <asc_sat/>
            <lut2/>
          </colorinfo>
          <labels>
            <label2>Violet</label2>
          </labels>
        </clipitem>`)
      }
    } else if (scene.hasImage) {
      const imageFile = mediaFiles.find(f => f.name.includes(`scene${scene.sceneNumber}-image`))
      if (imageFile) {
        videoTrack.push(`        <clipitem id="clipitem-${clipId++}">
          <masterclipid>masterclip-${fileId}</masterclipid>
          <name>${imageFile.name}</name>
          <enabled>TRUE</enabled>
          <duration>1294705</duration>
          <rate>
            <timebase>${frameRate}</timebase>
            <ntsc>TRUE</ntsc>
          </rate>
          <start>${currentFrame}</start>
          <end>${currentFrame + sceneDurationFrames}</end>
          <in>107892</in>
          <out>${107892 + sceneDurationFrames}</out>
          <pproTicksIn>${914456685542400}</pproTicksIn>
          <pproTicksOut>${914456685542400 + pproTicksOut}</pproTicksOut>
          <alphatype>none</alphatype>
          <pixelaspectratio>square</pixelaspectratio>
          <anamorphic>FALSE</anamorphic>
          <file id="file-${fileId++}">
            <name>${imageFile.name}</name>
            <pathurl>file://localhost/${imageFile.pathurl}</pathurl>
            <rate>
              <timebase>${frameRate}</timebase>
              <ntsc>TRUE</ntsc>
            </rate>
            <timecode>
              <rate>
                <timebase>${frameRate}</timebase>
                <ntsc>TRUE</ntsc>
              </rate>
              <string>00:00:00:00</string>
              <frame>0</frame>
              <displayformat>NDF</displayformat>
            </timecode>
            <media>
              <video>
                <samplecharacteristics>
                  <rate>
                    <timebase>${frameRate}</timebase>
                    <ntsc>TRUE</ntsc>
                  </rate>
                  <width>1924</width>
                  <height>1082</height>
                  <anamorphic>FALSE</anamorphic>
                  <pixelaspectratio>square</pixelaspectratio>
                  <fielddominance>none</fielddominance>
                </samplecharacteristics>
              </video>
            </media>
          </file>
          <logginginfo>
            <description/>
            <scene/>
            <shottake/>
            <lognote/>
            <good/>
            <originalvideofilename/>
            <originalaudiofilename/>
          </logginginfo>
          <colorinfo>
            <lut/>
            <lut1/>
            <asc_sop/>
            <asc_sat/>
            <lut2/>
          </colorinfo>
          <labels>
            <label2>Lavender</label2>
          </labels>
        </clipitem>`)
      }
    }
    
    if (scene.hasTTS) {
      const audioFile = mediaFiles.find(f => f.name.includes(`scene${scene.sceneNumber}-tts`))
      if (audioFile) {
        audioTrackClips.push(`          <clipitem id="clipitem-${clipId++}" premiereChannelType="mono">
            <masterclipid>masterclip-${fileId}</masterclipid>
            <name>${audioFile.name}</name>
            <enabled>TRUE</enabled>
            <duration>${sceneDurationFrames}</duration>
            <rate>
              <timebase>${frameRate}</timebase>
              <ntsc>TRUE</ntsc>
            </rate>
            <start>${currentFrame}</start>
            <end>${currentFrame + sceneDurationFrames}</end>
            <in>0</in>
            <out>${sceneDurationFrames}</out>
            <pproTicksIn>0</pproTicksIn>
            <pproTicksOut>${pproTicksOut}</pproTicksOut>
            <file id="file-${fileId++}">
              <name>${audioFile.name}</name>
              <pathurl>file://localhost/${audioFile.pathurl}</pathurl>
              <rate>
                <timebase>${frameRate}</timebase>
                <ntsc>TRUE</ntsc>
              </rate>
              <duration>${sceneDurationFrames}</duration>
              <timecode>
                <rate>
                  <timebase>${frameRate}</timebase>
                  <ntsc>TRUE</ntsc>
                </rate>
                <string>00;00;00;00</string>
                <frame>0</frame>
                <displayformat>DF</displayformat>
              </timecode>
              <media>
                <audio>
                  <samplecharacteristics>
                    <depth>16</depth>
                    <samplerate>44100</samplerate>
                  </samplecharacteristics>
                  <channelcount>1</channelcount>
                  <audiochannel>
                    <sourcechannel>1</sourcechannel>
                  </audiochannel>
                </audio>
              </media>
            </file>
            <sourcetrack>
              <mediatype>audio</mediatype>
              <trackindex>1</trackindex>
            </sourcetrack>
            <logginginfo>
              <description/>
              <scene/>
              <shottake/>
              <lognote/>
              <good/>
              <originalvideofilename/>
              <originalaudiofilename/>
            </logginginfo>
            <colorinfo>
              <lut/>
              <lut1/>
              <asc_sop/>
              <asc_sat/>
              <lut2/>
            </colorinfo>
            <labels>
              <label2>Caribbean</label2>
            </labels>
          </clipitem>`)
      }
    }
    
    // 자막 트랙 제거 (SRT 파일로 대체)
    // 자막 트랙 생성 코드 제거 (SRT 파일로 대체)
    
    currentFrame += sceneDurationFrames
  })

  const totalFrames = Math.round(timelineData.value.totalDuration * frameRate)

  // 제목 텍스트 트랙 제거 (SRT 파일로 대체)

  // 로고 이미지 트랙 생성
  if (exportSettings.value.includeLogoTrack && exportSettings.value.logoFile) {
    // 로고 위치 계산 (코너 위치)
    const logoPositions = {
      'top-left': '0.15:0.15',
      'top-right': '0.85:0.15', 
      'bottom-left': '0.15:0.85',
      'bottom-right': '0.85:0.85'
    }
    const logoPosition = logoPositions[exportSettings.value.logoPosition] || '0.85:0.15'
    
    // 로고 크기 계산 (스케일 값)
    const logoScales = {
      'small': '0.1',
      'medium': '0.2',
      'large': '0.3'
    }
    const logoScale = logoScales[exportSettings.value.logoSize] || '0.2'
    
    logoTrack.push(`        <clipitem id="clipitem-${clipId++}">
          <masterclipid>masterclip-logo</masterclipid>
          <name>Logo-${exportSettings.value.logoFile.name}</name>
          <enabled>TRUE</enabled>
          <duration>1294705</duration>
          <rate>
            <timebase>${frameRate}</timebase>
            <ntsc>TRUE</ntsc>
          </rate>
          <start>0</start>
          <end>${totalFrames}</end>
          <in>107892</in>
          <out>${107892 + totalFrames}</out>
          <pproTicksIn>914456685542400</pproTicksIn>
          <pproTicksOut>${914456685542400 + (totalFrames * 8475667200 / frameRate)}</pproTicksOut>
          <alphatype>straight</alphatype>
          <pixelaspectratio>square</pixelaspectratio>
          <anamorphic>FALSE</anamorphic>
          <file id="file-logo">
            <name>Logo-${exportSettings.value.logoFile.name}</name>
            <pathurl>file://localhost/assets/images/logo-${exportSettings.value.logoFile.name}</pathurl>
            <rate>
              <timebase>${frameRate}</timebase>
              <ntsc>TRUE</ntsc>
            </rate>
            <duration>${totalFrames}</duration>
            <timecode>
              <rate>
                <timebase>${frameRate}</timebase>
                <ntsc>TRUE</ntsc>
              </rate>
              <string>00:00:00:00</string>
              <frame>0</frame>
              <displayformat>NDF</displayformat>
            </timecode>
            <media>
              <video>
                <samplecharacteristics>
                  <rate>
                    <timebase>${frameRate}</timebase>
                    <ntsc>TRUE</ntsc>
                  </rate>
                  <width>${width}</width>
                  <height>${height}</height>
                  <anamorphic>FALSE</anamorphic>
                  <pixelaspectratio>square</pixelaspectratio>
                  <fielddominance>none</fielddominance>
                </samplecharacteristics>
              </video>
            </media>
          </file>
          <filter>
            <effect>
              <name>Motion</name>
              <effectid>motion</effectid>
              <effectcategory>motion</effectcategory>
              <effecttype>motion</effecttype>
              <mediatype>video</mediatype>
              <parameter authoringApp="PremierePro">
                <parameterid>1</parameterid>
                <name>Position</name>
                <IsTimeVarying>false</IsTimeVarying>
                <value>-91445760000000000,${logoPosition},0,0,0,0,0,0,5,4,0,0,0,0</value>
              </parameter>
              <parameter authoringApp="PremierePro">
                <parameterid>2</parameterid>
                <name>Scale</name>
                <IsTimeVarying>false</IsTimeVarying>
                <value>-91445760000000000,${logoScale},0,0,0,0,0,0</value>
              </parameter>
              <parameter authoringApp="PremierePro">
                <parameterid>8</parameterid>
                <name>Opacity</name>
                <IsTimeVarying>false</IsTimeVarying>
                <ParameterControlType>2</ParameterControlType>
                <LowerBound>0</LowerBound>
                <UpperBound>100</UpperBound>
                <value>-91445760000000000,80.,0,0,0,0,0,0</value>
              </parameter>
            </effect>
          </filter>
          <logginginfo>
            <description/>
            <scene/>
            <shottake/>
            <lognote/>
            <good/>
            <originalvideofilename/>
            <originalaudiofilename/>
          </logginginfo>
          <colorinfo>
            <lut/>
            <lut1/>
            <asc_sop/>
            <asc_sat/>
            <lut2/>
          </colorinfo>
          <labels></labels>
        </clipitem>`)
  }

  // 비디오 트랙 래핑 (메인 비디오, 자막, 제목 순서)
  const videoTrackClips = []
  
  // 메인 비디오 트랙
  videoTrackClips.push(`        <track TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="1">
${videoTrack.join('\n')}
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
        </track>`)

  // 자막과 제목 텍스트 트랙 제거 (SRT 파일로 대체)

  // 로고 이미지 트랙  
  if (exportSettings.value.includeLogoTrack && logoTrack.length > 0) {
    videoTrackClips.push(`        <track TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="0">
${logoTrack.join('\n')}
          <enabled>TRUE</enabled>
          <locked>TRUE</locked>
        </track>`)
  }

  const totalDurationFrames = Math.round(timelineData.value.totalDuration * frameRate)
  
  // 실제 Premiere Pro XML 형식으로 생성
  const premiereXml = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE xmeml>
<xmeml version="4">
  <sequence id="sequence-1" 
    MZ.Sequence.PreviewFrameSizeHeight="${height}" 
    MZ.Sequence.PreviewFrameSizeWidth="${width}" 
    MZ.WorkOutPoint="${totalDurationFrames * 8475667200}" 
    MZ.WorkInPoint="0">
    <uuid>${generateUUID()}</uuid>
    <duration>${totalDurationFrames}</duration>
    <rate>
      <timebase>${frameRate}</timebase>
      <ntsc>TRUE</ntsc>
    </rate>
    <name>${projectName}</name>
    <media>
      <video>
        <format>
          <samplecharacteristics>
            <rate>
              <timebase>${frameRate}</timebase>
              <ntsc>TRUE</ntsc>
            </rate>
            <codec>
              <name>Apple ProRes 422</name>
              <appspecificdata>
                <appname>Final Cut Pro</appname>
                <appmanufacturer>Apple Inc.</appmanufacturer>
                <appversion>7.0</appversion>
                <data>
                  <qtcodec>
                    <codecname>Apple ProRes 422</codecname>
                    <codectypename>Apple ProRes 422</codectypename>
                    <codectypecode>apcn</codectypecode>
                    <codecvendorcode>appl</codecvendorcode>
                    <spatialquality>1024</spatialquality>
                    <temporalquality>0</temporalquality>
                    <keyframerate>0</keyframerate>
                    <datarate>0</datarate>
                  </qtcodec>
                </data>
              </appspecificdata>
            </codec>
            <width>${width}</width>
            <height>${height}</height>
            <anamorphic>FALSE</anamorphic>
            <pixelaspectratio>square</pixelaspectratio>
            <fielddominance>none</fielddominance>
            <colordepth>24</colordepth>
          </samplecharacteristics>
        </format>
${videoTrackClips.join('\n')}
      </video>
      <audio>
        <numOutputChannels>2</numOutputChannels>
        <format>
          <samplecharacteristics>
            <depth>16</depth>
            <samplerate>48000</samplerate>
          </samplecharacteristics>
        </format>
        <outputs>
          <group>
            <index>1</index>
            <numchannels>1</numchannels>
            <downmix>0</downmix>
            <channel>
              <index>1</index>
            </channel>
          </group>
          <group>
            <index>2</index>
            <numchannels>1</numchannels>
            <downmix>0</downmix>
            <channel>
              <index>2</index>
            </channel>
          </group>
        </outputs>
        <track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="131" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Balance" currentExplodedTrackIndex="0" totalExplodedTrackCount="1" premiereTrackType="Stereo">
${audioTrackClips.join('\n')}
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
          <outputchannelindex>1</outputchannelindex>
        </track>
        <track TL.SQTrackAudioKeyframeStyle="0" TL.SQTrackShy="0" TL.SQTrackExpandedHeight="41" TL.SQTrackExpanded="0" MZ.TrackTargeted="1" PannerCurrentValue="0.5" PannerIsInverted="true" PannerStartKeyframe="-91445760000000000,0.5,0,0,0,0,0,0" PannerName="Balance" currentExplodedTrackIndex="0" totalExplodedTrackCount="2" premiereTrackType="Stereo">
          <enabled>TRUE</enabled>
          <locked>FALSE</locked>
          <outputchannelindex>2</outputchannelindex>
        </track>
      </audio>
    </media>
    <timecode>
      <rate>
        <timebase>${frameRate}</timebase>
        <ntsc>TRUE</ntsc>
      </rate>
      <string>00;00;00;00</string>
      <frame>0</frame>
      <displayformat>DF</displayformat>
    </timecode>
    <labels>
      <label2>Forest</label2>
    </labels>
    <logginginfo>
      <description/>
      <scene/>
      <shottake/>
      <lognote/>
      <good/>
      <originalvideofilename/>
      <originalaudiofilename/>
    </logginginfo>
  </sequence>
</xmeml>`
  
  return premiereXml
}

// 프로젝트 정보 JSON 생성
const generateProjectInfo = () => {
  return JSON.stringify({
    projectName: exportSettings.value.projectName || props.project?.name || 'Untitled Project',
    exportDate: new Date().toISOString(),
    settings: {
      resolution: exportSettings.value.resolution,
      frameRate: exportSettings.value.frameRate,
      videoTrimMode: exportSettings.value.videoTrimMode,
      enableKenBurns: exportSettings.value.enableKenBurns,
      imageToVideo: exportSettings.value.imageToVideo
    },
    timeline: {
      totalDuration: timelineData.value.totalDuration,
      totalScenes: timelineData.value.scenes.length,
      scenes: timelineData.value.scenes.map(scene => ({
        sceneNumber: scene.sceneNumber,
        startTime: scene.startTime,
        endTime: scene.endTime,
        duration: scene.duration,
        script: scene.script,
        hasAssets: {
          tts: scene.hasTTS,
          video: scene.hasVideo,
          image: scene.hasImage
        }
      }))
    },
    metadata: {
      generatedBy: 'Kairos AI',
      version: '1.0.0',
      description: 'AI-generated storyboard exported for Premiere Pro'
    }
  }, null, 2)
}

// README 생성
const generateReadme = () => {
  const projectName = exportSettings.value.projectName || props.project?.name || 'Untitled Project'
  
  return `# ${projectName} - Premiere Pro 프로젝트

카이로스 AI에서 생성된 스토리보드를 Adobe Premiere Pro에서 편집하기 위한 프로젝트 파일입니다.

## 📂 파일 구조

\`\`\`
${projectName.replace(/[^a-zA-Z0-9]/g, '-')}-export/
├── ${projectName}.xml             # Premiere Pro 프로젝트 파일
├── assets/                        # 미디어 에셋
│   ├── audio/                     # TTS 오디오 파일
│   ├── videos/                    # 생성된 비디오 파일
│   └── images/                    # 생성된 이미지 파일
├── project-info.json              # 프로젝트 메타데이터
└── README.md                      # 이 파일
\`\`\`

## 🎬 타임라인 정보

- **총 재생시간**: ${formatDuration(timelineData.value.totalDuration)}
- **총 씬 수**: ${timelineData.value.scenes.length}개
- **해상도**: ${exportSettings.value.resolution}
- **프레임레이트**: ${exportSettings.value.frameRate} fps

## 🚀 Premiere Pro에서 열기

1. Adobe Premiere Pro를 실행합니다
2. File > Import... 메뉴를 클릭합니다
3. \`${projectName}.xml\` 파일을 선택합니다
4. 가져오기 설정을 확인하고 Import를 클릭합니다

## 📝 씬별 정보

${timelineData.value.scenes.map(scene => `### 씬 ${scene.sceneNumber}
- **시간**: ${formatTime(scene.startTime)} → ${formatTime(scene.endTime)} (${formatDuration(scene.duration)})
- **TTS**: ${scene.hasTTS ? '✅' : '❌'}
- **비디오**: ${scene.hasVideo ? (scene.isUpscaled ? `✅ (업스케일 ${scene.upscaleFactor})` : '✅') : '❌'}
- **이미지**: ${scene.hasImage ? '✅' : '❌'}
- **스크립트**: ${scene.script || '없음'}
`).join('\n')}

## ⚙️ 내보내기 설정

- **비디오 트림 방식**: ${exportSettings.value.videoTrimMode}
- **켄 번즈 효과**: ${exportSettings.value.enableKenBurns ? '활성화' : '비활성화'}
- **이미지→비디오 변환**: ${exportSettings.value.imageToVideo ? '활성화' : '비활성화'}

## 💡 편집 팁

1. **TTS 오디오가 기준 타임라인**입니다. 비디오 클립들이 TTS 길이에 맞춰 배치되어 있습니다.
2. **비디오가 TTS보다 긴 경우** 자동으로 트림되었습니다. 필요시 원본 길이로 늘릴 수 있습니다.
3. **이미지 씬**은 정적 클립으로 배치되어 있습니다. 켄 번즈 효과나 모션을 추가할 수 있습니다.
4. **자막 트랙**은 향후 추가 예정입니다. 현재는 수동으로 추가해주세요.

## 📞 지원

문제가 발생하면 카이로스 AI 팀에 문의해주세요.

---
Generated by Kairos AI | ${new Date().toLocaleDateString('ko-KR')}
`
}

// ZIP 파일 생성 및 다운로드
const createAndDownloadZip = async (premiereXml, projectInfo, readme) => {
  const zip = new JSZip()
  const projectName = (exportSettings.value.projectName || props.project?.name || 'Untitled Project')
    .replace(/[^a-zA-Z0-9가-힣\s]/g, '-')
    .replace(/\s+/g, '-')
  
  // 메인 파일들 추가
  zip.file(`${projectName}.xml`, premiereXml)
  zip.file('project-info.json', projectInfo)
  zip.file('README.md', readme)
  
  // SRT 자막 파일 생성 및 추가
  if (exportSettings.value.includeSceneScript) {
    // SRT 시간 포맷 변환 함수 (초 → HH:MM:SS,mmm)
    const formatSRTTime = (seconds) => {
      const hours = Math.floor(seconds / 3600)
      const minutes = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      const milliseconds = Math.floor((seconds % 1) * 1000)
      
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`
    }
    
    // SRT 자막 파일 생성 (비동기 처리)
    let srtContent = ''
    let subtitleIndex = 1
    let currentTime = 0
    
    for (const scene of timelineData.value.scenes) {
      if (scene.script && scene.script.trim()) {
        const script = scene.script.trim()
        
        // 자막 분할 기능
        if (exportSettings.value.splitSubtitles) {
          // Gemini 2.5 Flash를 활용한 의미단락 기반 자막 분할
          const splitSubtitleWithAI = async (text, targetChars) => {
            // 구두점을 제외한 실제 텍스트 길이 계산
            const getTextLength = (str) => {
              return str.replace(/[.,!?。，、;:"'()]/g, '').length
            }
            
            const actualLength = getTextLength(text)
            const minLength = targetChars - 5
            const maxLength = targetChars + 5
            
            // 목표 범위 내에 있으면 그대로 반환
            if (actualLength <= maxLength) {
              return [text]
            }
            
            try {
              console.log(`AI 자막 분할 시작: "${text}" (목표: ${targetChars}±5글자)`)
              
              const prompt = `다음 한국어 텍스트를 자막용으로 분할해주세요.

📏 길이 조건: 각 줄은 ${minLength}~${maxLength}글자 (쉼표, 마침표 제외한 실제 글자수)
🎯 분할 원칙:
- 의미가 완전한 단위로만 분할
- 자연스러운 호흡/말하기 단위 우선
- 접속사(그런데, 하지만, 그리고 등)는 뒤 문장과 함께
- 조사(는, 은, 가, 이, 을, 를 등) 앞에서 분할 금지

⚠️ 중요: 반드시 줄바꿈으로 분할된 결과만 출력하세요. 설명이나 번호 없이 분할된 텍스트만 각각 새로운 줄에 작성하세요.

${text}`

              // 임시: 직접 Google AI API 호출 (개발 환경에서만)
              const isDev = import.meta.env.DEV
              let response
              
              if (isDev) {
                // 개발 환경: 직접 Google AI API 호출
                const { GoogleGenerativeAI } = await import('@google/generative-ai')
                const apiKey = import.meta.env.VITE_GOOGLE_API_KEY
                
                if (!apiKey) {
                  throw new Error('VITE_GOOGLE_API_KEY not found')
                }
                
                const genAI = new GoogleGenerativeAI(apiKey)
                let modelName = 'gemini-2.0-flash-experimental'
                
                // 사용 가능한 모델 후보들 시도
                const modelCandidates = [
                  'gemini-2.0-flash-lite',
                  'gemini-1.5-flash',
                  'gemini-1.5-pro'
                ]
                
                let result
                for (const candidate of modelCandidates) {
                  try {
                    console.log(`모델 시도: ${candidate}`)
                    const model = genAI.getGenerativeModel({ model: candidate })
                    result = await model.generateContent(prompt)
                    modelName = candidate
                    console.log(`모델 성공: ${candidate}`)
                    break
                  } catch (error) {
                    console.log(`모델 실패: ${candidate} - ${error.message}`)
                    continue
                  }
                }
                
                if (!result) {
                  throw new Error('모든 모델에서 실패')
                }
                const aiResult = await result.response.text()
                
                response = {
                  ok: true,
                  json: async () => ({
                    success: true,
                    text: aiResult
                  })
                }
              } else {
                // 프로덕션: Netlify 함수 호출
                response = await fetch('/.netlify/functions/generateGeminiText', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    prompt: prompt,
                    model: 'gemini-2.0-flash-experimental'
                  })
                })
              }
              
              if (!response.ok) {
                throw new Error('Gemini API 호출 실패')
              }
              
              const data = await response.json()
              const aiResult = data.text.trim()
              
              console.log('AI 분할 결과:', aiResult)
              
              // AI 응답을 더 정교하게 분할하고 정리
              let aiParts = aiResult
                .split(/\n+/) // 여러 줄바꿈도 처리
                .map(line => line.trim())
                .filter(line => line.length > 0)
                .filter(line => !line.match(/^(분할 결과|결과|답변|해답|분석|다음과 같이|이렇게)[:：]?/i))
                .filter(line => !line.match(/^\d+\.\s*$/)) // 숫자만 있는 줄 제거
                .map(line => line.replace(/^\d+\.\s*/, '').trim()) // 번호 제거
                .filter(line => getTextLength(line) >= 3)
                
              // AI가 한 줄로 응답했을 경우를 대비한 추가 분할 시도
              if (aiParts.length === 1 && getTextLength(aiParts[0]) > maxLength + 10) {
                console.log('AI가 한 줄로 응답함, 추가 분할 시도:', aiParts[0])
                const longText = aiParts[0]
                aiParts = []
                
                // 문장 단위로 재분할 시도
                const sentences = longText.split(/([.!?。]\s*)/).filter(s => s.trim())
                let currentPart = ''
                
                for (const sentence of sentences) {
                  const testPart = currentPart + sentence
                  if (getTextLength(testPart) <= maxLength) {
                    currentPart = testPart
                  } else {
                    if (currentPart.trim()) {
                      aiParts.push(currentPart.trim())
                    }
                    currentPart = sentence
                  }
                }
                if (currentPart.trim()) {
                  aiParts.push(currentPart.trim())
                }
              }
              
              // AI 결과 검증 및 후처리
              const validatedParts = []
              
              console.log(`AI가 ${aiParts.length}개 파트로 분할:`, aiParts.map(p => `"${p}" (${getTextLength(p)}글자)`))
              
              for (const part of aiParts) {
                const partLength = getTextLength(part)
                
                // 목표 범위를 크게 벗어나는 경우 추가 분할
                if (partLength > maxLength + 10) {
                  console.log(`⚠️ AI 결과가 너무 긺: "${part}" (${partLength}글자) - 폴백 분할`)
                  const subParts = await fallbackSplit(part, targetChars)
                  validatedParts.push(...subParts)
                } else if (partLength < minLength - 3 && aiParts.length > 1) {
                  // 너무 짧은 경우 다음 파트와 합치기 시도
                  console.log(`⚠️ AI 결과가 너무 짧음: "${part}" (${partLength}글자) - 다음과 합치기 시도`)
                  const nextPartIndex = aiParts.indexOf(part) + 1
                  if (nextPartIndex < aiParts.length) {
                    const nextPart = aiParts[nextPartIndex]
                    const combined = part + ' ' + nextPart
                    const combinedLength = getTextLength(combined)
                    
                    if (combinedLength <= maxLength + 5) {
                      validatedParts.push(combined)
                      aiParts.splice(nextPartIndex, 1) // 다음 파트 제거
                      continue
                    }
                  }
                  validatedParts.push(part) // 합칠 수 없으면 그대로 추가
                } else {
                  validatedParts.push(part)
                }
              }
              
              // 강제 분할이 필요한 경우 체크
              const finalParts = []
              for (const part of validatedParts) {
                const partLength = getTextLength(part)
                if (partLength > maxLength + 15) {
                  console.log(`🔧 최종 강제 분할: "${part}" (${partLength}글자)`)
                  const forceSplit = await fallbackSplit(part, targetChars)
                  finalParts.push(...forceSplit)
                } else {
                  finalParts.push(part)
                }
              }
              
              console.log('✅ 최종 분할 결과:', finalParts)
              return finalParts.length > 0 ? finalParts : [text]
              
            } catch (error) {
              console.error('AI 자막 분할 실패, 폴백 사용:', error)
              return await fallbackSplit(text, targetChars)
            }
          }
          
          // AI 실패 시 폴백 분할 로직
          const fallbackSplit = async (text, targetChars) => {
            const getTextLength = (str) => {
              return str.replace(/[.,!?。，、;:"'()]/g, '').length
            }
            
            const actualLength = getTextLength(text)
            const maxLength = targetChars + 5
            
            if (actualLength <= maxLength) {
              return [text]
            }
            
            const parts = []
            let remaining = text.trim()
            
            while (getTextLength(remaining) > maxLength) {
              let bestSplitPoint = -1
              let bestDistance = Infinity
              
              // 의미 단위 분할 우선순위
              const splitPatterns = [
                /\s+(?=[그런데|하지만|그러나|또한|그리고|따라서|그래서|즉|만약|그런데|하지만])/g, // 접속사 앞
                /[.!?。]\s+/g,  // 문장 끝
                /[,，、]\s+/g,  // 쉼표 뒤
                /\s+(?=[는|은|가|이|을|를|에게|한테|에서|로|으로])/g, // 조사 앞
                /\s+/g  // 일반 공백
              ]
              
              for (const pattern of splitPatterns) {
                pattern.lastIndex = 0
                let match
                
                while ((match = pattern.exec(remaining)) !== null) {
                  const position = match.index + match[0].length
                  const beforeText = remaining.substring(0, position).trim()
                  const beforeLength = getTextLength(beforeText)
                  
                  if (beforeLength >= targetChars - 5 && beforeLength <= maxLength) {
                    bestSplitPoint = position
                    break
                  } else if (beforeLength < maxLength && beforeLength >= 8) {
                    const distance = Math.abs(beforeLength - targetChars)
                    if (distance < bestDistance) {
                      bestDistance = distance
                      bestSplitPoint = position
                    }
                  }
                }
                
                if (bestSplitPoint !== -1) break
              }
              
              if (bestSplitPoint !== -1) {
                const part = remaining.substring(0, bestSplitPoint).trim()
                parts.push(part)
                remaining = remaining.substring(bestSplitPoint).trim()
              } else {
                // 강제 분할
                const firstSpace = remaining.indexOf(' ', Math.min(targetChars, remaining.length / 2))
                if (firstSpace !== -1) {
                  const part = remaining.substring(0, firstSpace).trim()
                  parts.push(part)
                  remaining = remaining.substring(firstSpace).trim()
                } else {
                  parts.push(remaining)
                  break
                }
              }
            }
            
            if (remaining.trim().length > 0) {
              parts.push(remaining.trim())
            }
            
            return parts.filter(part => part.length > 0)
          }
          
          const subtitleParts = await splitSubtitleWithAI(script, exportSettings.value.targetCharsPerLine)
          
          // 텍스트 길이 기반 타이밍 계산
          const getTextLength = (str) => {
            return str.replace(/[.,!?。，、;:"'()]/g, '').length
          }
          
          const totalTextLength = subtitleParts.reduce((sum, part) => sum + getTextLength(part), 0)
          const partTimings = []
          
          // 각 파트의 텍스트 길이 비율에 따라 시간 배분
          for (const part of subtitleParts) {
            const partTextLength = getTextLength(part)
            const ratio = partTextLength / totalTextLength
            const duration = scene.duration * ratio
            partTimings.push({
              text: part,
              duration: Math.max(duration, 0.8) // 최소 0.8초 보장
            })
          }
          
          console.log('자막 타이밍 계산:', {
            totalDuration: scene.duration,
            totalTextLength,
            partTimings: partTimings.map(p => ({ text: p.text, duration: p.duration.toFixed(2) }))
          })
          
          // 개선된 타이밍으로 SRT 생성
          let accumulatedTime = currentTime
          
          partTimings.forEach((timing, partIndex) => {
            const partStartTime = formatSRTTime(accumulatedTime)
            const partEndTime = formatSRTTime(accumulatedTime + timing.duration)
            
            srtContent += `${subtitleIndex}\n`
            srtContent += `${partStartTime} --> ${partEndTime}\n`
            srtContent += `${timing.text}\n\n`
            
            accumulatedTime += timing.duration
            subtitleIndex++
          })
        } else {
          // 분할하지 않는 경우 (기존 로직)
          const startTime = formatSRTTime(currentTime)
          const endTime = formatSRTTime(currentTime + scene.duration)
          
          srtContent += `${subtitleIndex}\n`
          srtContent += `${startTime} --> ${endTime}\n`
          srtContent += `${script}\n\n`
          
          subtitleIndex++
        }
      }
      currentTime += scene.duration
    }
    
    if (srtContent.trim()) {
      zip.file(`${projectName}_subtitles.srt`, srtContent)
      console.log('SRT 자막 파일 생성됨:', `${projectName}_subtitles.srt`)
    }
  }
  
  // assets 폴더 구조 생성
  const assetsFolder = zip.folder('assets')
  const audioFolder = assetsFolder.folder('audio')
  const videosFolder = assetsFolder.folder('videos')
  const imagesFolder = assetsFolder.folder('images')
  
  // 에셋 파일들 다운로드 및 ZIP에 추가
  console.log('ZIP 생성 시작, 총 씬:', timelineData.value.scenes.length)
  
  for (const scene of timelineData.value.scenes) {
    try {
      console.log(`씬 ${scene.sceneNumber} 처리 시작:`, {
        hasTTS: scene.hasTTS,
        hasVideo: scene.hasVideo,
        hasImage: scene.hasImage,
        isUpscaled: scene.isUpscaled,
        videoUrl: scene.videoUrl
      })
      
      // TTS 오디오 파일
      if (scene.hasTTS && scene.ttsUrl) {
        console.log(`씬 ${scene.sceneNumber} TTS 다운로드:`, scene.ttsUrl)
        const audioResponse = await fetch(scene.ttsUrl)
        if (audioResponse.ok) {
          const audioBlob = await audioResponse.blob()
          audioFolder.file(`scene${scene.sceneNumber}-tts.mp3`, audioBlob)
          console.log(`씬 ${scene.sceneNumber} TTS 다운로드 완료`)
        } else {
          console.error(`씬 ${scene.sceneNumber} TTS 다운로드 실패:`, audioResponse.status)
        }
      }
      
      // 비디오 파일 (업스케일 여부 파일명에 표시)
      if (scene.hasVideo && scene.videoUrl) {
        console.log(`씬 ${scene.sceneNumber} 비디오 다운로드:`, {
          videoUrl: scene.videoUrl,
          isUpscaled: scene.isUpscaled,
          upscaleFactor: scene.upscaleFactor
        })
        
        const videoResponse = await fetch(scene.videoUrl)
        if (videoResponse.ok) {
          const videoBlob = await videoResponse.blob()
          const upscaleTag = scene.isUpscaled ? `-upscaled-${scene.upscaleFactor || '4x'}` : ''
          const fileName = `scene${scene.sceneNumber}-video${upscaleTag}.mp4`
          
          console.log(`씬 ${scene.sceneNumber} 비디오 다운로드 완료:`, {
            fileName,
            fileSize: videoBlob.size,
            isUpscaled: scene.isUpscaled,
            upscaleFactor: scene.upscaleFactor
          })
          
          videosFolder.file(fileName, videoBlob)
        } else {
          console.error(`씬 ${scene.sceneNumber} 비디오 다운로드 실패:`, {
            status: videoResponse.status, 
            statusText: videoResponse.statusText,
            url: scene.videoUrl
          })
        }
      }
      
      // 이미지 파일
      if (scene.hasImage && scene.imageUrl) {
        const imageResponse = await fetch(scene.imageUrl)
        if (imageResponse.ok) {
          const imageBlob = await imageResponse.blob()
          imagesFolder.file(`scene${scene.sceneNumber}-image.jpg`, imageBlob)
        }
      }
    } catch (error) {
      console.warn(`씬 ${scene.sceneNumber} 에셋 다운로드 실패:`, error)
    }
  }
  
  // 로고 파일 추가 (업로드된 경우)
  if (exportSettings.value.includeLogoTrack && exportSettings.value.logoFile) {
    try {
      imagesFolder.file(`logo-${exportSettings.value.logoFile.name}`, exportSettings.value.logoFile)
    } catch (error) {
      console.warn('로고 파일 추가 실패:', error)
    }
  }
  
  // ZIP 파일 생성
  console.log('ZIP 생성 중...')
  console.log('ZIP에 포함될 파일 목록:')
  
  // ZIP 내용 확인
  zip.forEach((relativePath, file) => {
    if (!file.dir) {
      console.log(`- ${relativePath}`)
    }
  })
  
  const zipBlob = await zip.generateAsync({ type: 'blob' })
  console.log('ZIP 생성 완료, 파일 크기:', zipBlob.size, 'bytes')
  
  // 다운로드 시작
  const downloadLink = document.createElement('a')
  downloadLink.href = URL.createObjectURL(zipBlob)
  downloadLink.download = `${projectName}-premiere-export.zip`
  document.body.appendChild(downloadLink)
  downloadLink.click()
  document.body.removeChild(downloadLink)
  
  // 메모리 정리
  URL.revokeObjectURL(downloadLink.href)
  
  alert(`✅ ${projectName} 프로젝트가 성공적으로 내보내졌습니다!\n\n📦 다운로드된 ZIP 파일을 압축 해제한 후\n🎬 ${projectName}.xml 파일을 Premiere Pro에서 열어주세요.`)
}
</script>

<style scoped>
.export-view {
  padding: 1.5rem;
  max-width: 1200px;
  margin: 0 auto;
}

.export-header {
  text-align: center;
  margin-bottom: 2rem;
}

.export-header h2 {
  color: var(--primary-color);
  margin-bottom: 0.5rem;
}

.export-header p {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* 타임라인 미리보기 */
.timeline-preview {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
  border-left: 4px solid #8b5cf6;
  border: 1px solid var(--border-color);
}

.timeline-preview h3 {
  color: #a78bfa;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.timeline-loading {
  text-align: center;
  padding: 2rem;
}

.timeline-summary {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  background: var(--bg-secondary);
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.summary-card h4 {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-bottom: 0.5rem;
}

.duration, .count, .assets {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--primary-color);
}

/* 타임라인 트랙 */
.timeline-tracks {
  border: 2px solid var(--border-color);
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 1.5rem;
}

.track {
  border-bottom: 1px solid var(--border-color);
}

.track:last-child {
  border-bottom: none;
}

.track-header {
  background: var(--bg-secondary);
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border-color);
}

.track-header h4 {
  margin: 0;
  font-size: 0.9rem;
}

.track-content {
  display: flex;
  height: 50px;
  position: relative;
}

.track-content.disabled {
  opacity: 0.5;
  background: repeating-linear-gradient(
    45deg,
    transparent,
    transparent 10px,
    rgba(0,0,0,0.1) 10px,
    rgba(0,0,0,0.1) 20px
  );
}

.timeline-segment {
  border-right: 1px solid rgba(255,255,255,0.3);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  padding: 0.25rem;
  font-size: 0.75rem;
  font-weight: 500;
}

.audio-segment {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.video-segment.has-video {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.video-segment.has-video.upscaled {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  position: relative;
}

.video-segment.has-video.upscaled::after {
  content: '✨';
  position: absolute;
  top: 2px;
  right: 4px;
  font-size: 10px;
}

.video-segment.has-image {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.video-segment.no-media {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  color: #8b4513;
}

.caption-segment {
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
  color: #333;
}

.segment-label {
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.segment-duration {
  font-size: 0.65rem;
  opacity: 0.8;
}

/* 씬 상세 정보 */
.scenes-detail h4 {
  margin-bottom: 1rem;
}

.scenes-list {
  display: grid;
  gap: 1rem;
}

.scene-item {
  background: var(--bg-secondary);
  border: 2px solid var(--border-color);
  border-radius: 8px;
  padding: 1rem;
  transition: all 0.2s;
}

.scene-item.incomplete {
  border-color: #fbbf24;
  background: rgba(245, 158, 11, 0.1);
}

.scene-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.scene-number {
  font-weight: 600;
  color: var(--primary-color);
}

.scene-time {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.scene-assets {
  display: flex;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.asset-status {
  font-size: 0.85rem;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  background: rgba(239, 68, 68, 0.1);
  color: #f87171;
  border: 1px solid rgba(239, 68, 68, 0.2);
}

.asset-status.available {
  background: rgba(34, 197, 94, 0.1);
  color: #4ade80;
  border: 1px solid rgba(34, 197, 94, 0.2);
}

.asset-status.available.upscaled {
  background: rgba(99, 102, 241, 0.1);
  color: #a5b4fc;
  font-weight: 600;
  border: 1px solid rgba(99, 102, 241, 0.3);
}

.scene-script {
  font-size: 0.9rem;
  color: var(--text-secondary);
  font-style: italic;
  padding: 0.5rem;
  background: var(--bg-secondary);
  border-radius: 4px;
  border: 1px solid var(--border-color);
}

/* 내보내기 설정 */
.export-settings {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
  border-left: 4px solid #10b981;
  border: 1px solid var(--border-color);
}

.export-settings h3 {
  color: #34d399;
  margin-bottom: 1rem;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 1.5rem;
  margin-top: 1rem;
}

.setting-group h4 {
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.radio-group, .checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.radio-group label, .checkbox-group label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  color: var(--text-primary);
  transition: all 0.2s;
}

.radio-group label:hover, .checkbox-group label:hover {
  color: var(--primary-color);
}

.input-group {
  margin-bottom: 1rem;
}

.input-group label {
  display: block;
  margin-bottom: 0.25rem;
  font-weight: 500;
  color: var(--text-primary);
}

.input-group input, .input-group select {
  width: 100%;
  padding: 0.75rem;
  border: 2px solid var(--border-color);
  border-radius: 8px;
  font-size: 0.9rem;
  transition: all 0.2s;
  background: var(--bg-primary);
}

.input-group input:focus, .input-group select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.input-group input[type="checkbox"], .input-group input[type="radio"] {
  width: auto;
  margin-right: 0.5rem;
}

/* 자막 분할 옵션 스타일 개선 */
.subtitle-split-options {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

.split-settings {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background: var(--bg-primary);
  border-radius: 6px;
  border: 1px solid var(--border-color);
}

.input-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.input-row label {
  min-width: 120px;
  font-weight: 500;
}

.number-input {
  width: 80px !important;
  text-align: center;
}

.input-hint {
  font-size: 0.8rem;
  color: var(--text-secondary);
  font-style: italic;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  padding: 0.5rem 0;
  font-weight: 500;
  color: var(--text-primary);
  transition: all 0.2s;
}

.checkbox-label:hover {
  color: var(--primary-color);
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
  transform: scale(1.1);
}

/* 서브 옵션 스타일 */
.sub-options {
  margin-top: 1rem;
  padding: 1rem;
  background: var(--bg-secondary);
  border-radius: 8px;
  border: 1px solid var(--border-color);
}

/* 로고 업로드 섹션 */
.logo-upload-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.upload-btn {
  padding: 0.5rem 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
  white-space: nowrap;
}

.logo-filename {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-style: italic;
}

/* 내보낼 파일들 섹션 */
.export-files {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: var(--shadow-sm);
  border-left: 4px solid var(--primary-color);
  border: 1px solid var(--border-color);
}

.export-files h3 {
  color: var(--primary-color);
  margin-bottom: 1rem;
  font-size: 1.25rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 내보내기 액션 */
.export-actions {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
  border: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 2rem;
}

.export-info h4 {
  margin-bottom: 0.75rem;
}

.export-info ul {
  list-style: none;
  padding: 0;
}

.export-info li {
  padding: 0.25rem 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.export-buttons {
  display: flex;
  gap: 1rem;
  flex-shrink: 0;
}

.btn-primary, .btn-secondary {
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: var(--primary-color);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
}

.btn-secondary {
  background: transparent;
  border: 2px solid var(--border-color);
  color: var(--text-primary);
}

.btn-secondary:hover {
  border-color: var(--primary-color);
  color: var(--primary-color);
  background: rgba(79, 70, 229, 0.1);
}

.btn-primary:disabled, .btn-secondary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 에셋 없을 때 */
.no-timeline {
  text-align: center;
  padding: 3rem 2rem;
}

.no-timeline-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.no-timeline h3 {
  margin-bottom: 0.5rem;
  color: var(--text-primary);
}

.no-timeline p {
  color: var(--text-secondary);
  margin-bottom: 1.5rem;
}

/* 로딩 스피너 */
.loading-spinner, .loading-spinner-small {
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 1rem;
}

.loading-spinner-small {
  width: 16px;
  height: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 반응형 */
@media (max-width: 768px) {
  .export-view {
    padding: 1rem;
  }
  
  .timeline-summary {
    grid-template-columns: 1fr;
  }
  
  .settings-grid {
    grid-template-columns: 1fr;
  }
  
  .export-actions {
    flex-direction: column;
    align-items: stretch;
  }
  
  .export-buttons {
    justify-content: stretch;
  }
  
  .export-buttons button {
    flex: 1;
  }
  
  .scene-assets {
    flex-direction: column;
    gap: 0.5rem;
  }
  
  .scene-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.25rem;
  }

  .input-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .input-row label {
    min-width: auto;
  }

  .logo-upload-section {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .track-content {
    height: 40px;
  }

  .timeline-segment {
    font-size: 0.7rem;
    padding: 0.2rem;
  }

  .segment-duration {
    font-size: 0.6rem;
  }
}

/* 체크박스 스타일 */
.checkbox-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  margin: 0;
  transform: scale(1.1);
}

.checkbox-label:hover {
  color: var(--primary-color);
}
/* 자막 분할 옵션 스타일 */
.subtitle-split-options {
  margin-top: 12px;
  padding-left: 20px;
  border-left: 3px solid var(--primary-color);
  background: var(--bg-secondary);
  padding: 12px 16px;
  border-radius: 6px;
}

.split-settings {
  margin-top: 12px;
  padding-left: 16px;
}

.input-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.input-row label {
  flex-shrink: 0;
  min-width: 140px;
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.number-input {
  width: 80px;
  padding: 6px 10px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.9rem;
}

.input-hint {
  font-size: 0.85rem;
  color: var(--text-secondary);
}
</style>