<template>
  <div class="production-table-root">
    <div class="production-table-wrapper" :class="{ 'panel-open': mediaPanelOpen }">
    <!-- 선택된 씬이 있을 때 표시되는 액션 바 -->
    <div v-if="selectedScenes.length > 0" class="selection-actions">
      <div class="selection-info">
        <span class="selection-count">{{ selectedScenes.length }}개 씬 선택됨</span>
      </div>
      <div class="selection-buttons">
        <button @click="playBatchTTS" class="btn-play-tts">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          TTS 일괄 듣기
        </button>
        <button @click="generateBatchTTS" class="btn-tts">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
            <line x1="12" y1="19" x2="12" y2="22"></line>
          </svg>
          TTS 생성
        </button>
        <button @click="downloadBatchTTS" class="btn-download-tts">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          TTS 다운로드
        </button>
        <button @click="downloadBatchImages" class="btn-download-images">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
            <circle cx="8.5" cy="8.5" r="1.5"></circle>
            <polyline points="21 15 16 10 5 21"></polyline>
          </svg>
          이미지 다운로드
        </button>
        <button @click="downloadBatchVideos" class="btn-download-videos">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="23 7 16 12 23 17 23 7"></polygon>
            <rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect>
          </svg>
          비디오 다운로드
        </button>
        <button @click="mergeSelectedScenes" class="btn-merge" :disabled="selectedScenes.length < 2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m8 6 4-4 4 4"/>
            <path d="M12 2v10.3a4 4 0 0 1-1.172 2.872L4 22"/>
            <path d="m20 22-6.928-6.928A4 4 0 0 1 12 12.3V2"/>
          </svg>
          씬 병합
        </button>
        <button @click="showGroupingModal = true" class="btn-group" :disabled="selectedScenes.length < 1">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
          </svg>
          그룹화
        </button>
        <button @click="deleteSelectedScenes" class="btn-delete">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            <line x1="10" y1="11" x2="10" y2="17"></line>
            <line x1="14" y1="11" x2="14" y2="17"></line>
          </svg>
          삭제
        </button>
      </div>
    </div>

    <!-- TTS 플레이어 -->
    <div v-if="showTTSPlayer" class="tts-player">
      <div class="player-header">
        <div class="track-info">
          <h4>씬 {{ currentTrack?.sceneNumber }} - TTS 재생</h4>
          <p>{{ currentTrack?.text?.substring(0, 60) }}{{ currentTrack?.text?.length > 60 ? '...' : '' }}</p>
        </div>
        <div class="playlist-info">
          {{ playlistProgress.current }} / {{ playlistProgress.total }}
        </div>
        <button @click="closeTTSPlayer" class="close-player-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
      </div>
      
      <div class="player-controls">
        <button @click="playPrevious" :disabled="currentTrackIndex === 0" class="control-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="19 20 9 12 19 4 19 20"></polygon>
            <line x1="5" y1="19" x2="5" y2="5"></line>
          </svg>
        </button>
        
        <button @click="togglePlayPause" class="play-pause-btn">
          <svg v-if="!isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 3 19 12 5 21 5 3"></polygon>
          </svg>
          <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="6" y="4" width="4" height="16"></rect>
            <rect x="14" y="4" width="4" height="16"></rect>
          </svg>
        </button>
        
        <button @click="playNext" :disabled="currentTrackIndex === ttsPlaylist.length - 1" class="control-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="5 4 15 12 5 20 5 4"></polygon>
            <line x1="19" y1="5" x2="19" y2="19"></line>
          </svg>
        </button>
      </div>
      
      <div class="player-progress">
        <span class="time-current">{{ formatTime(currentTime) }}</span>
        <div class="progress-bar">
          <div class="progress-fill" :style="{ width: duration ? (currentTime / duration * 100) + '%' : '0%' }"></div>
        </div>
        <span class="time-duration">{{ formatTime(duration) }}</span>
      </div>
      
      <!-- 전체 플레이리스트 타임라인 -->
      <div class="playlist-timeline">
        <div class="timeline-header">
          <h5>전체 타임라인</h5>
          <div class="timeline-time">
            {{ formatTime(playlistCurrentTime) }} / {{ formatTime(totalPlaylistDuration) }}
          </div>
        </div>
        
        <div class="timeline-container">
          <div 
            class="timeline-progress-bar" 
            @click="onTimelineClick"
            ref="timelineBarRef"
          >
            <div 
              class="timeline-progress-fill" 
              :style="{ width: totalPlaylistDuration ? (playlistCurrentTime / totalPlaylistDuration * 100) + '%' : '0%' }"
            ></div>
          </div>
          
          <!-- TTS 트랙 세그먼트 표시 -->
          <div class="timeline-tracks">
            <div 
              v-for="(track, index) in ttsPlaylist" 
              :key="track.id"
              class="timeline-track"
              :class="{ active: index === currentTrackIndex }"
              :style="{ 
                width: totalPlaylistDuration && track.duration ? (track.duration / totalPlaylistDuration * 100) + '%' : '0%' 
              }"
              @click="jumpToTrack(index)"
              :title="`씬 ${track.sceneNumber}: ${track.text.substring(0, 50)}...`"
            >
              <span class="track-number">{{ track.sceneNumber }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    
    <div class="production-table-container">
      <table class="production-table">
        <!-- 데스크탑/태블릿 컬럼 너비 설정 -->
        <colgroup v-if="!isMobile && !isTabletPortrait">
          <col style="width: 8%;">  <!-- 체크박스/씬번호 (증가) -->
          <col style="width: 23%;"> <!-- 이미지/비디오 -->
          <col style="width: 45%;"> <!-- 스크립트 원본 -->
          <col style="width: 14%;"> <!-- 에셋 (감소) -->
          <col style="width: 10%;"> <!-- TTS -->
        </colgroup>
        <!-- 태블릿 세로 모드 컬럼 너비 설정 -->
        <colgroup v-else-if="isTabletPortrait">
          <col style="width: 10%;">  <!-- 체크박스/씬번호 -->
          <col style="width: 30%;"> <!-- 이미지/비디오 (증가) -->
          <col style="width: 35%;"> <!-- 스크립트 원본 -->
          <col style="width: 15%;"> <!-- 에셋 (감소) -->
          <col style="width: 10%;"> <!-- TTS -->
        </colgroup>
        <!-- 모바일 컬럼 너비 설정 -->
        <colgroup v-else>
          <col style="width: 100%;"> <!-- 모바일은 카드 형식 -->
        </colgroup>
        <thead>
          <tr>
            <th class="scene-number-col">
            <input 
              type="checkbox" 
              :checked="isAllSelected"
              @change="toggleSelectAll"
            >
          </th>
          <th class="scene-image-col">
            <div class="media-header" v-if="!isMobile">
              <div class="media-switch-container">
                <span class="media-label" :class="{ active: globalMediaType === 'image' }">이미지</span>
                <label class="media-switch">
                  <input 
                    type="checkbox" 
                    :checked="globalMediaType === 'video'"
                    @change="switchGlobalMediaType(globalMediaType === 'image' ? 'video' : 'image')"
                  >
                  <span class="switch-slider"></span>
                </label>
                <span class="media-label" :class="{ active: globalMediaType === 'video' }">비디오</span>
              </div>
            </div>
          </th>
          <th class="script-col">스크립트 원본</th>
          <th v-if="isMobile" class="director-guide-col">연출가이드</th>
          <th v-if="!isMobile" class="assets-col">
            <div class="assets-header">
              <span>에셋</span>
              <div class="asset-filter-dropdown">
                <button class="filter-toggle-btn" @click="toggleAssetFilterDropdown">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M3 6h18M7 12h10m-7 6h4"/>
                  </svg>
                </button>
                <div v-if="showAssetFilterDropdown" class="filter-dropdown-menu" @click.stop>
                  <div class="filter-option">
                    <input 
                      type="checkbox" 
                      id="filter-characters"
                      v-model="assetFilter.characters"
                    />
                    <label for="filter-characters">
                      <span class="filter-color characters-color"></span>
                      캐릭터
                    </label>
                  </div>
                  <div class="filter-option">
                    <input 
                      type="checkbox" 
                      id="filter-backgrounds"
                      v-model="assetFilter.backgrounds"
                    />
                    <label for="filter-backgrounds">
                      <span class="filter-color backgrounds-color"></span>
                      배경
                    </label>
                  </div>
                  <div class="filter-option">
                    <input 
                      type="checkbox" 
                      id="filter-props"
                      v-model="assetFilter.props"
                    />
                    <label for="filter-props">
                      <span class="filter-color props-color"></span>
                      소품/그래픽
                    </label>
                  </div>
                  <div class="filter-option">
                    <input 
                      type="checkbox" 
                      id="filter-reference"
                      v-model="assetFilter.referenceSources"
                    />
                    <label for="filter-reference">
                      <span class="filter-color reference-color"></span>
                      참고소스
                    </label>
                  </div>
                </div>
              </div>
            </div>
          </th>
          <th class="tts-col">
            TTS
            <span v-if="totalTTSDuration > 0" class="tts-total-duration">
              ({{ formatDuration(totalTTSDuration) }})
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <template v-for="group in groupedScenes" :key="group.id">
          <!-- 시퀀스 이름 행 -->
          <tr class="sequence-header-row" v-if="group.name !== 'Sequence 1'">
            <td :colspan="!isMobile ? 9 : 1" class="sequence-header-cell">
              <div class="sequence-header-content">
                <span class="sequence-name-label">{{ group.name }}</span>
              </div>
            </td>
          </tr>
          <template v-for="(scene, sceneIdx) in group.scenes" :key="scene.id">
            <tr 
              class="production-sheet-data-row"
              :class="{ 
                selected: isSelected(scene.id),
                'being-dragged': draggedItem === scene.id,
                'drop-target': dropTarget === scene.id && dropTarget !== draggedItem
              }"
              :draggable="true"
              @dragstart="handleDragStart(scene, $event)"
              @dragover.prevent="handleDragOver(scene, $event)"
              @dragenter.prevent="handleDragEnter(scene)"
              @dragleave="handleDragLeave"
              @drop.prevent="handleDrop(scene, $event)"
              @dragend="handleDragEnd"
              @mouseover="setHoveredItem(scene.id)"
              @mouseleave="clearHoveredItem()"
            >
            <td v-if="!isMobile" class="scene-number-col" :data-label="'씬 번호'">
              <div class="scene-number-wrapper">
                <input 
                  type="checkbox" 
                  :checked="isSelected(scene.id)"
                  @change="toggleSelect(scene.id)"
                >
                <span class="scene-number">#S{{ scene.scene_number }}</span>
                <span class="scene-type-badge" :class="getSceneTypeClass(scene)">
                  {{ getSceneType(scene) }}
                </span>
              </div>
            </td>
            
            <td v-if="!isMobile" class="scene-image-col" :data-label="'이미지/비디오'">
              <SceneImageUploader
                :scene-id="scene.id"
                :scene-number="scene.scene_number"
                :image-url="scene.scene_image_url"
                :video-url="scene.scene_video_url"
                :media-type="globalMediaType"
                :project-id="projectId"
                @update="handleImageUpdate(scene.id, $event)"
                @view-image="showFullImage"
              />
            </td>
            <!-- 모바일에서는 씬 번호와 이미지를 하나의 셀로 합침 -->
            <td v-if="isMobile" class="mobile-scene-header" colspan="3">
              <div class="mobile-header-row">
                <input 
                  type="checkbox" 
                  :checked="isSelected(scene.id)"
                  @change="toggleSelect(scene.id)"
                >
                <span class="scene-number">#S{{ scene.scene_number }}</span>
                <!-- 모바일에서는 시퀀스 뱃지 제거 (시퀀스 이름은 상단에 표시됨) -->
              </div>
              <div class="mobile-media-container">
                <SceneImageUploader
                  :scene-id="scene.id"
                  :scene-number="scene.scene_number"
                  :image-url="scene.scene_image_url"
                  :video-url="scene.scene_video_url"
                  :media-type="globalMediaType"
                  :project-id="projectId"
                  :hide-switch="true"
                  @update="handleImageUpdate(scene.id, $event)"
                  @view-image="showFullImage"
                />
              </div>
            </td>
            <td class="script-col editable-cell" :data-label="isMobile ? '오리지널 스크립트' : ''" @click="!isTablet ? startEditing(scene.id, 'original_script_text', scene.original_script_text) : null">
              <template v-if="isEditing(scene.id, 'original_script_text')">
                <textarea 
                  :id="`edit-${scene.id}-original_script_text`"
                  v-model="editedValue"
                  @blur="handleBlurWithConfirmation(scene, 'original_script_text')"
                  @input="handleInputChange"
                  @keydown.esc.prevent="handleEscapeKey"
                  @keydown.enter.ctrl="saveEdit(scene, 'original_script_text')"
                  @keydown.enter.shift.prevent="splitSceneAtCursor(scene)"
                  rows="3"
                  class="edit-input edit-textarea"
                  :class="{ 'has-changes': hasUnsavedChanges }"
                ></textarea>
                <div v-if="hasUnsavedChanges" class="edit-status">
                  <span class="unsaved-indicator">• 저장되지 않은 변경사항</span>
                </div>
                <div class="edit-hint">
                  Ctrl+Enter: 저장 | Shift+Enter: 씬 분할 | Esc: 취소
                </div>
              </template>
              <template v-else>
                <div class="script-content" @click="startEditing(scene.id, 'original_script_text', scene.original_script_text)">
                  {{ scene.original_script_text }}
                </div>
                <!-- 태블릿 (세로/가로모드) 및 데스크탑에서 연출가이드를 스크립트 아래에 표시 -->
                <div v-if="isTablet || isDesktop" class="director-guide-inline">
                  <!-- 태블릿 (세로/가로모드)에서 토글 버튼 표시 -->
                  <button 
                    v-if="isTablet"
                    class="director-guide-toggle"
                    @click.stop="toggleDirectorGuide(scene.id)"
                  >
                    <span class="toggle-icon">{{ expandedDirectorGuides[scene.id] ? '▼' : '▶' }}</span>
                    <span>연출가이드</span>
                  </button>
                  <!-- 데스크탑에서는 항상 표시, 태블릿에서는 토글 시 표시 -->
                  <div v-if="isDesktop || expandedDirectorGuides[scene.id]" class="director-guide-content-inline">
                    <div v-if="isEditing(scene.id, 'director_guide')">
                      <textarea 
                        :id="`edit-${scene.id}-director-guide`"
                        v-model="editedValue"
                        @blur="handleDirectorGuideBlur(scene)"
                        @keydown.esc.prevent="cancelEdit"
                        @keydown.ctrl.enter.prevent="handleDirectorGuideEnter(scene)"
                        placeholder="시각적 연출 방안을 입력하세요..."
                        class="edit-textarea"
                        rows="3"
                      />
                      <div class="edit-hint">Ctrl+Enter: 저장, Esc: 취소</div>
                    </div>
                    <div v-else @click.stop="startEditingDirectorGuide(scene.id, scene.director_guide)">
                      <p v-if="scene.director_guide" class="guide-text">{{ scene.director_guide }}</p>
                      <span v-else class="empty-hint">연출가이드 추가 (클릭하여 편집)</span>
                    </div>
                  </div>
                </div>
              </template>
            </td>
            
            
            <!-- 연출가이드 컬럼 (모바일에서만 별도 컬럼으로 표시) -->
            <td v-if="isMobile" class="director-guide-col editable-cell" 
                :data-label="'연출가이드'">
              <!-- 모바일 뷰: 태블릿과 동일한 버튼 방식 -->
              <button 
                class="director-guide-toggle mobile-guide-btn"
                @click.stop="toggleDirectorGuide(scene.id)"
              >
                <span class="toggle-icon">{{ expandedDirectorGuides[scene.id] ? '▼' : '▶' }}</span>
                <span>연출가이드</span>
              </button>
              <!-- 펼쳐진 콘텐츠 -->
              <div v-if="expandedDirectorGuides[scene.id]" class="director-guide-content-mobile">
                <template v-if="!isEditing(scene.id, 'director_guide')">
                  <div class="guide-text-wrapper" @click="startEditingDirectorGuide(scene.id, scene.director_guide)">
                    <p v-if="scene.director_guide" class="guide-text">{{ scene.director_guide }}</p>
                    <span v-else class="empty-hint">연출가이드를 추가하려면 클릭하세요</span>
                  </div>
                </template>
                <!-- 편집 모드 -->
                <template v-else-if="isEditing(scene.id, 'director_guide')">
                <textarea 
                  :id="`edit-${scene.id}-director-guide`"
                  v-model="editedValue"
                  @blur="handleDirectorGuideBlur(scene)"
                  @keydown.esc.prevent="cancelEdit"
                  @keydown.ctrl.enter.prevent="handleDirectorGuideEnter(scene)"
                  placeholder="시각적 연출 방안을 입력하세요..."
                  class="edit-textarea"
                  rows="3"
                />
                <div class="edit-hint">Ctrl+Enter: 저장, Esc: 취소</div>
              </template>
              </div>
            </td>
            
            <!-- 에셋 컬럼 -->
            <td v-if="!isMobile" class="assets-col" :data-label="isMobile ? '에셋' : ''">
              <div class="assets-container">
                <!-- 캐릭터 -->
                <div v-if="assetFilter.characters && scene.characters && scene.characters.length > 0" class="asset-section characters-section" 
                     @mouseover="hoveredAsset = `${scene.id}-characters`" 
                     @mouseleave="hoveredAsset = null"
                     @click="startEditingCharacters(scene.id, scene.characters)"
                     :class="{ 'editable-hover': hoveredAsset === `${scene.id}-characters`, 'editing': editingCell === `${scene.id}-characters` }">
                  <div class="asset-type-label">캐릭터</div>
                  <div v-if="editingCell !== `${scene.id}-characters`" class="tag-list">
                    <span 
                      v-for="(character, idx) in scene.characters" 
                      :key="`char-${idx}`"
                      class="tag character-tag"
                    >
                      {{ character }}
                    </span>
                  </div>
                  <div v-else class="edit-input-container">
                    <input 
                      :id="`edit-${scene.id}-characters`"
                      type="text" 
                      v-model="editedValue" 
                      @keydown.enter="saveCharactersEdit(scene)"
                      @keydown.escape="cancelEdit"
                      @blur="saveCharactersEdit(scene)"
                      class="edit-input"
                      placeholder="캐릭터 이름들 (쉼표로 구분)"
                    />
                  </div>
                  <div v-if="hoveredAsset === `${scene.id}-characters` && editingCell !== `${scene.id}-characters`" class="edit-hint">
                    클릭하여 편집
                  </div>
                </div>
                
                <!-- 배경 -->
                <div v-if="assetFilter.backgrounds && scene.backgrounds && scene.backgrounds.length > 0" class="asset-section backgrounds-section"
                     @mouseover="hoveredAsset = `${scene.id}-backgrounds`" 
                     @mouseleave="hoveredAsset = null"
                     @click="startEditingBackgrounds(scene.id, scene.backgrounds)"
                     :class="{ 'editable-hover': hoveredAsset === `${scene.id}-backgrounds`, 'editing': editingCell === `${scene.id}-backgrounds` }">
                  <div class="asset-type-label">배경</div>
                  <div v-if="editingCell !== `${scene.id}-backgrounds`" class="tag-list">
                    <span 
                      v-for="(background, idx) in scene.backgrounds" 
                      :key="`bg-${idx}`"
                      class="tag background-tag"
                    >
                      {{ background }}
                    </span>
                  </div>
                  <div v-else class="edit-input-container">
                    <input 
                      :id="`edit-${scene.id}-backgrounds`"
                      type="text" 
                      v-model="editedValue" 
                      @keydown.enter="saveBackgroundsEdit(scene)"
                      @keydown.escape="cancelEdit"
                      @blur="saveBackgroundsEdit(scene)"
                      class="edit-input"
                      placeholder="배경 설명들 (쉼표로 구분)"
                    />
                  </div>
                  <div v-if="hoveredAsset === `${scene.id}-backgrounds` && editingCell !== `${scene.id}-backgrounds`" class="edit-hint">
                    클릭하여 편집
                  </div>
                </div>
                
                <!-- 소품/그래픽 -->
                <div v-if="assetFilter.props && scene.props && scene.props.length > 0" class="asset-section props-section"
                     @mouseover="hoveredAsset = `${scene.id}-props`" 
                     @mouseleave="hoveredAsset = null"
                     @click="startEditingProps(scene.id, scene.props)"
                     :class="{ 'editable-hover': hoveredAsset === `${scene.id}-props`, 'editing': editingCell === `${scene.id}-props` }">
                  <div class="asset-type-label">소품/그래픽</div>
                  <div v-if="editingCell !== `${scene.id}-props`" class="tag-list">
                    <span 
                      v-for="(prop, idx) in scene.props" 
                      :key="`prop-${idx}`"
                      class="tag prop-tag"
                    >
                      {{ prop }}
                    </span>
                  </div>
                  <div v-else class="edit-input-container">
                    <input 
                      :id="`edit-${scene.id}-props`"
                      type="text" 
                      v-model="editedValue" 
                      @keydown.enter="savePropsEdit(scene)"
                      @keydown.escape="cancelEdit"
                      @blur="savePropsEdit(scene)"
                      class="edit-input"
                      placeholder="소품/그래픽 설명들 (쉼표로 구분)"
                    />
                  </div>
                  <div v-if="hoveredAsset === `${scene.id}-props` && editingCell !== `${scene.id}-props`" class="edit-hint">
                    클릭하여 편집
                  </div>
                </div>
                
                <!-- 자료 키워드 -->
                <div v-if="assetFilter.referenceSources && scene.reference_keywords && scene.reference_keywords.length > 0" class="asset-section keywords-section">
                  <div class="asset-type-label">자료</div>
                  <div class="tag-list">
                    <span 
                      v-for="(keyword, idx) in scene.reference_keywords" 
                      :key="`keyword-${idx}`"
                      class="tag reference-keyword-tag"
                    >
                      {{ keyword }}
                    </span>
                  </div>
                </div>
                
                <!-- 자료 소스 -->
                <div v-if="assetFilter.referenceSources && getReferenceSources(scene) && getReferenceSources(scene).length > 0" class="asset-section sources-section">
                  <div class="asset-type-label">참고 소스</div>
                  <div class="tag-list">
                    <span 
                      v-for="(source, idx) in getReferenceSources(scene)" 
                      :key="`source-${idx}`"
                      class="tag reference-source-tag"
                    >
                      {{ source }}
                    </span>
                  </div>
                </div>
                
                <span 
                  v-if="!hasAnyAssets(scene)" 
                  class="empty-hint clickable-hint"
                  @click="handleEmptyAssetClick(scene)"
                >
                  {{ getEmptyAssetHintText() }}
                </span>
              </div>
            </td>
            <td class="tts-col" :data-label="isMobile ? '' : 'TTS 컨트롤'">
              <div class="tts-controls" :class="{ 'mobile-inline': isMobile }">
                <!-- TTS가 없을 때 -->
                <button 
                  v-if="!ttsData[scene.id]"
                  @click="generateTTS(scene)"
                  class="tts-generate-btn"
                  :class="{ 'mobile-compact': isMobile }"
                  :disabled="!scene.original_script_text || loadingTTS[scene.id]"
                >
                  <span v-if="loadingTTS[scene.id]" class="loading-spinner-small"></span>
                  <span v-else>{{ isMobile ? 'TTS' : '생성' }}</span>
                </button>
                
                <!-- TTS가 있을 때 -->
                <template v-else>
                  <!-- 검증 실패 시 경고 표시 -->
                  <div v-if="ttsData[scene.id]?.validation_failed && !isMobile" class="tts-validation-warning">
                    ⚠️ 로드 실패
                  </div>
                  
                  <button 
                    @click="playTTS(scene.id)"
                    class="tts-play-btn"
                    :class="{ 
                      'playing': playingTTS[scene.id],
                      'validation-failed': ttsData[scene.id]?.validation_failed,
                      'mobile-compact': isMobile
                    }"
                    :disabled="ttsData[scene.id]?.validation_failed"
                    :title="ttsData[scene.id]?.validation_failed ? 'TTS 파일을 로드할 수 없습니다' : '재생'"
                  >
                    <Pause v-if="playingTTS[scene.id]" :size="isMobile ? 12 : 14" />
                    <Play v-else :size="isMobile ? 12 : 14" />
                  </button>
                  
                  <span class="tts-duration" :class="{ 'mobile-compact': isMobile }" v-if="ttsData[scene.id]?.duration && !ttsData[scene.id]?.validation_failed">
                    {{ formatDuration(ttsData[scene.id].duration) }}
                  </span>
                  
                  <button 
                    @click="generateTTS(scene, true)"
                    class="tts-regenerate-btn"
                    :class="{ 
                      'validation-failed-regenerate': ttsData[scene.id]?.validation_failed,
                      'mobile-compact': isMobile 
                    }"
                    :disabled="loadingTTS[scene.id]"
                    :title="ttsData[scene.id]?.validation_failed ? '파일 재생성 권장' : '재생성'"
                  >
                    <span v-if="loadingTTS[scene.id]" class="loading-spinner-small"></span>
                    <svg v-else-if="isMobile" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"/>
                    </svg>
                    <span v-else>재생성</span>
                  </button>
                  
                  <button 
                    @click="downloadTTS(scene)"
                    class="tts-download-btn"
                    :class="{ 'mobile-compact': isMobile }"
                    :disabled="ttsData[scene.id]?.validation_failed"
                    :title="ttsData[scene.id]?.validation_failed ? '다운로드 불가' : '다운로드'"
                  >
                    <Download :size="isMobile ? 12 : 14" />
                  </button>
                </template>
              </div>

              <!-- 에셋 섹션 (모바일용) -->
              <div v-if="isMobile" class="mobile-assets-section">
                <div class="mobile-assets-header">에셋</div>
                <div class="assets-container">
                  <!-- 캐릭터 -->
                  <div v-if="assetFilter.characters && scene.characters && scene.characters.length > 0" class="asset-section characters-section">
                    <div class="asset-type-label">캐릭터</div>
                    <div class="tag-list">
                      <span v-for="(char, idx) in scene.characters" :key="idx" class="asset-tag character-tag">
                        {{ char }}
                      </span>
                    </div>
                  </div>

                  <!-- 배경 -->
                  <div v-if="assetFilter.backgrounds && scene.backgrounds && scene.backgrounds.length > 0" class="asset-section backgrounds-section">
                    <div class="asset-type-label">배경</div>
                    <div class="tag-list">
                      <span v-for="(bg, idx) in scene.backgrounds" :key="idx" class="asset-tag background-tag">
                        {{ bg }}
                      </span>
                    </div>
                  </div>

                  <!-- 소품 -->
                  <div v-if="assetFilter.props && scene.props && scene.props.length > 0" class="asset-section props-section">
                    <div class="asset-type-label">소품</div>
                    <div class="tag-list">
                      <span v-for="(prop, idx) in scene.props" :key="idx" class="asset-tag prop-tag">
                        {{ prop }}
                      </span>
                    </div>
                  </div>

                  <!-- 참고자료 -->
                  <div v-if="assetFilter.referenceSources && getReferenceSources(scene).length > 0" class="asset-section reference-section">
                    <div class="asset-type-label">참고자료</div>
                    <div class="tag-list">
                      <span v-for="(ref, idx) in getReferenceSources(scene)" :key="idx" class="asset-tag reference-tag">
                        {{ ref }}
                      </span>
                    </div>
                  </div>

                  <!-- 에셋이 없는 경우 -->
                  <div v-if="!hasAnyAssets(scene)" class="empty-assets">
                    <span class="empty-hint">에셋 정보 없음</span>
                  </div>
                </div>
              </div>
            </td>
          </tr>
          <!-- 모바일에서 씬 추가 버튼 (씬 사이에 겹쳐짐) -->
          <div v-if="isMobile && sceneIdx < group.scenes.length - 1" class="mobile-scene-divider">
            <button @click="addRow(scene.scene_number)" class="mobile-add-scene-floating-btn">
              + 씬 추가
            </button>
          </div>
          <!-- 데스크탑 씬 추가 버튼 오버레이 -->
          <tr v-if="!isMobile && sceneIdx < group.scenes.length - 1" class="scene-divider-row">
            <td colspan="6" class="scene-divider-cell">
              <div 
                class="add-scene-overlay"
                :class="{ 'visible': hoveredItemId === scene.id || hoveredItemId === `divider-${scene.id}` }"
                @mouseenter="setHoveredItem(`divider-${scene.id}`)"
                @mouseleave="clearHoveredItem()"
              >
                <button @click="addRow(scene.scene_number)" class="add-scene-overlay-button">
                  + 씬 추가
                </button>
              </div>
            </td>
          </tr>
          </template>
        </template>
      </tbody>
    </table>
    
    <!-- 데이터 없음 -->
    <div v-if="scenes.length === 0" class="no-data">
      <p>아직 생성된 씬이 없습니다.</p>
    </div>
    </div>
    </div>
  
    <!-- 미디어 패널 (데스크톱용) -->
    <MediaPanel 
      v-if="projectId && !isMobile"
      ref="mediaPanel"
      :project-id="projectId"
      @panel-toggle="mediaPanelOpen = $event"
    />

    <!-- 씬 그룹화 모달 -->
    <div v-if="showGroupingModal" class="modal-overlay" @click.self="closeGroupingModal">
      <div class="modal-content grouping-modal">
        <div class="modal-header">
          <h3>씬 그룹화</h3>
          <button @click="closeGroupingModal" class="modal-close">×</button>
        </div>
        
        <div class="modal-body">
          <div class="selected-scenes-preview">
            <h4>선택된 씬: {{ selectedScenes.length }}개</h4>
            <div class="scene-list">
              <div v-for="sceneId in selectedScenes" :key="sceneId" class="scene-item">
                <span class="scene-number">#S{{ getSceneNumber(sceneId) }}</span>
                <span class="scene-text">{{ getSceneText(sceneId) }}</span>
              </div>
            </div>
          </div>
          
          <div class="grouping-options">
            <div class="option-group">
              <h4>그룹 타입 선택</h4>
              <div class="radio-group">
                <label>
                  <input type="radio" value="new" v-model="groupingType">
                  새 그룹 생성
                </label>
                <label>
                  <input type="radio" value="sequence" v-model="groupingType">
                  시퀀스로 그룹화
                </label>
              </div>
            </div>
            
            <div v-if="groupingType === 'new'" class="input-group">
              <label>그룹 이름</label>
              <input 
                v-model="newGroupName" 
                type="text" 
                placeholder="예: '오프닝 시퀀스', '결말 전투' 등"
                class="form-input"
              >
            </div>
            
            <div v-if="groupingType === 'sequence'" class="input-group">
              <label>시퀀스 선택</label>
              <select v-model="selectedSequenceId" class="form-select">
                <option v-for="(name, index) in sequenceNames" :key="index" :value="index + 1">
                  {{ name }}
                </option>
              </select>
              <button @click="addNewSequence" class="btn-add-sequence">
                새 시퀀스 추가
              </button>
            </div>
            
            <div class="input-group">
              <label>씬 태그 (선택사항)</label>
              <input 
                v-model="sceneTags" 
                type="text" 
                placeholder="콤마로 구분 (예: 액션, 대화, 회상)"
                class="form-input"
              >
            </div>
          </div>
        </div>
        
        <div class="modal-footer">
          <button @click="closeGroupingModal" class="btn-cancel">취소</button>
          <button @click="applyGrouping" class="btn-apply" :disabled="!canApplyGrouping">적용</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted, watch } from 'vue'
import { useProductionStore } from '@/stores/production'
import { useProjectsStore } from '@/stores/projects'
import { supabase } from '@/utils/supabase'
import SceneImageUploader from './SceneImageUploader.vue'
import MediaPanel from '@/components/storyboard/MediaPanel.vue'
import JSZip from 'jszip'
import { Download, Play, Pause } from 'lucide-vue-next'

const props = defineProps({
  scenes: {
    type: Array,
    default: () => []
  },
  selectedScenes: {
    type: Array,
    default: () => []
  },
  projectId: {
    type: String,
    required: true
  },
  mediaType: {
    type: String,
    default: 'image'
  }
})

const emit = defineEmits(['update:selected', 'edit-scene', 'add-scene', 'delete-scene', 'update-scene', 'character-extraction', 'update:media-type'])

const productionStore = useProductionStore()
const projectsStore = useProjectsStore()

// State
const editingCell = ref(null)
const editedValue = ref('')
const hoveredItemId = ref(null)
const hoveredAsset = ref(null)
const isSaving = ref(false)
const expandedDirectorGuides = ref({}) // 태블릿에서 펼친 연출가이드 추적

// 미디어 타입 관리 - props로 받은 값 사용
const globalMediaType = computed({
  get: () => props.mediaType,
  set: (value) => emit('update:media-type', value)
})
const pollingInterval = ref(null) // 자동 새로고침용 interval

// 에셋 필터링 상태
const assetFilter = ref({
  characters: true,
  backgrounds: true, 
  props: true,
  referenceSources: true
})
const showAssetFilterDropdown = ref(false)

// MediaPanel 관련
const mediaPanel = ref(null)
const mediaPanelOpen = ref(false)

// 화면 크기 감지
const isMobile = ref(window.innerWidth <= 768)
const isTabletPortrait = ref(window.innerWidth > 768 && window.innerWidth <= 900)
const isTablet = ref(window.innerWidth > 768 && window.innerWidth <= 1024)
const isDesktop = ref(window.innerWidth > 1024)

const handleResize = () => {
  const width = window.innerWidth
  isMobile.value = width <= 768
  isTabletPortrait.value = width > 768 && width <= 900
  isTablet.value = width > 768 && width <= 1024
  isDesktop.value = width > 1024
}

window.addEventListener('resize', handleResize)

// 시퀀스별로 그룹화된 씬들
const groupedScenes = computed(() => {
  const groups = new Map()
  
  props.scenes.forEach(scene => {
    // sequence_id가 null, undefined, 0인 경우 모두 기본값 1로 처리
    const sequenceId = scene.sequence_id && scene.sequence_id > 0 ? scene.sequence_id : 1
    // sequence_name이 없거나 빈 문자열인 경우, sequenceId에 따라 기본값 설정
    const sequenceName = scene.sequence_name && scene.sequence_name.trim() 
      ? scene.sequence_name 
      : `Sequence ${sequenceId}`
    
    if (!groups.has(sequenceId)) {
      groups.set(sequenceId, {
        id: sequenceId,
        name: sequenceName,
        scenes: []
      })
    }
    
    groups.get(sequenceId).scenes.push(scene)
  })
  
  // 각 그룹 내 씬들을 scene_number 순으로 정렬하고, 시퀀스 ID 순으로 정렬
  return Array.from(groups.values())
    .map(group => ({
      ...group,
      scenes: group.scenes.sort((a, b) => (a.scene_number || 0) - (b.scene_number || 0))
    }))
    .sort((a, b) => a.id - b.id)
})

// 모바일에서 각 씬별 미디어 타입 관리 (기본값: image)
const sceneMediaTypes = ref({})

// 씬별 미디어 타입 초기화
const initSceneMediaTypes = () => {
  props.scenes.forEach(scene => {
    if (!sceneMediaTypes.value[scene.id]) {
      sceneMediaTypes.value[scene.id] = 'image'
    }
  })
}


// TTS 관련 상태
const loadingTTS = ref({})
const ttsData = ref({}) // { sceneId: { file_url, duration, version } }
const playingTTS = ref({})
const audioElements = ref({})

// 드래그 앤 드롭 관련 상태
const draggedItem = ref(null)
const dropTarget = ref(null)
const dragOverPosition = ref('') // 'before' | 'after'
const isDragging = ref(false)

// 인라인 편집 안전장치 관련 상태
const originalValue = ref('') // 원본 값 보관
const editTimeout = ref(null) // 디바운스 타이머
const hasUnsavedChanges = ref(false) // 저장되지 않은 변경사항 유무

// 씬 그룹화 관련 상태
const showGroupingModal = ref(false)
const newGroupName = ref('')
const selectedSequenceId = ref(1)
const sequenceNames = ref(['Sequence 1'])
const groupingType = ref('new')
const sceneTags = ref('')

// Computed
const isAllSelected = computed(() => {
  return props.scenes.length > 0 && 
         props.selectedScenes.length === props.scenes.length
})

// TTS 총 듀레이션 계산
const totalTTSDuration = computed(() => {
  let total = 0
  props.scenes.forEach(scene => {
    if (ttsData.value[scene.id]?.duration) {
      total += ttsData.value[scene.id].duration
    }
  })
  return total
})

// Methods
const isSelected = (sceneId) => {
  return props.selectedScenes.includes(sceneId)
}

const toggleSelect = (sceneId) => {
  let newSelected = [...props.selectedScenes]
  
  if (isSelected(sceneId)) {
    newSelected = newSelected.filter(id => id !== sceneId)
  } else {
    newSelected.push(sceneId)
  }
  
  emit('update:selected', newSelected)
}

const toggleSelectAll = () => {
  if (isAllSelected.value) {
    emit('update:selected', [])
  } else {
    emit('update:selected', props.scenes.map(s => s.id))
  }
}

// 인라인 편집 관련 함수들 (안전장치 강화)
const startEditing = async (sceneId, field, value) => {
  // 이미 편집 중인 다른 셀이 있으면 저장 확인
  if (editingCell.value && editingCell.value !== `${sceneId}-${field}`) {
    if (hasUnsavedChanges.value) {
      const confirmSave = confirm('저장되지 않은 변경사항이 있습니다. 저장하시겠습니까?')
      if (confirmSave) {
        // 현재 편집 중인 셀 저장 후 새 편집 시작
        await savePreviousEdit()
      } else {
        // 취소 후 새 편집 시작
        cancelEdit()
      }
    }
  }
  
  // 디바운스 처리 (빠른 클릭 방지)
  if (editTimeout.value) {
    clearTimeout(editTimeout.value)
  }
  
  editTimeout.value = setTimeout(() => {
    editingCell.value = `${sceneId}-${field}`
    originalValue.value = value || '' // 원본 값 보관
    editedValue.value = value || ''
    hasUnsavedChanges.value = false
    
    nextTick(() => {
      const input = document.querySelector(`#edit-${sceneId}-${field}`)
      if (input) {
        input.focus()
        if (input.type === 'textarea') {
          input.setSelectionRange(input.value.length, input.value.length)
        }
      }
    })
  }, 200) // 200ms 디바운스
}

const startEditingCharacters = (sceneId, characters) => {
  editingCell.value = `${sceneId}-characters`
  // 배열을 쉼표로 구분된 문자열로 변환
  editedValue.value = characters ? characters.join(', ') : ''
  nextTick(() => {
    const input = document.querySelector(`#edit-${sceneId}-characters`)
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  })
}

const startEditingBackgrounds = (sceneId, backgrounds) => {
  editingCell.value = `${sceneId}-backgrounds`
  editedValue.value = backgrounds ? backgrounds.join(', ') : ''
  nextTick(() => {
    const input = document.querySelector(`#edit-${sceneId}-backgrounds`)
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  })
}

const startEditingProps = (sceneId, props) => {
  editingCell.value = `${sceneId}-props`
  editedValue.value = props ? props.join(', ') : ''
  nextTick(() => {
    const input = document.querySelector(`#edit-${sceneId}-props`)
    if (input) {
      input.focus()
      input.setSelectionRange(input.value.length, input.value.length)
    }
  })
}

// 입력 변경 감지
const handleInputChange = () => {
  hasUnsavedChanges.value = editedValue.value !== originalValue.value
}

// blur 이벤트 처리 (확인 절차 포함)
const handleBlurWithConfirmation = async (scene, field) => {
  // 변경사항이 없으면 그냥 취소
  if (!hasUnsavedChanges.value) {
    cancelEdit()
    return
  }
  
  // 빈 값으로 변경되었는지 확인
  if (!editedValue.value.trim() && originalValue.value.trim()) {
    const confirmEmpty = confirm('스크립트 내용을 비우시겠습니까? 이 작업은 되돌릴 수 없습니다.')
    if (!confirmEmpty) {
      // 취소 시 원본 값으로 복원
      editedValue.value = originalValue.value
      hasUnsavedChanges.value = false
      return
    }
  }
  
  // 중요한 변경사항인 경우 확인
  const significantChange = Math.abs(editedValue.value.length - originalValue.value.length) > 50
  if (significantChange) {
    const confirmSave = confirm('대량의 텍스트가 변경되었습니다. 저장하시겠습니까?')
    if (!confirmSave) {
      editedValue.value = originalValue.value
      hasUnsavedChanges.value = false
      cancelEdit()
      return
    }
  }
  
  await saveEdit(scene, field)
}

// 이전 편집 저장
const savePreviousEdit = async () => {
  const [sceneId, field] = editingCell.value.split('-')
  const scene = props.scenes.find(s => s.id === sceneId)
  if (scene) {
    await saveEdit(scene, field)
  }
}

const saveEdit = async (scene, field) => {
  if (editedValue.value === originalValue.value) {
    cancelEdit()
    return
  }
  
  console.log(`Saving ${field}:`, editedValue.value)
  console.log('Scene ID:', scene.id)
  
  try {
    // Supabase 직접 호출
    const { data, error } = await supabase
      .from('production_sheets')
      .update({ [field]: editedValue.value })
      .eq('id', scene.id)
      .select()
      .single()
    
    console.log(`Direct Supabase response for ${field}:`, { data, error })
    
    if (error) {
      console.error('Supabase error:', error)
      alert(`저장에 실패했습니다: ${error.message}`)
      return
    } else {
      console.log(`${field} saved successfully, data:`, data)
      
      // 로컬 상태 업데이트
      if (data[field] !== undefined) {
        scene[field] = data[field]
      }
      
      // Store 상태 업데이트
      const index = productionStore.productionSheets.findIndex(sheet => sheet.id === scene.id)
      if (index !== -1 && data[field] !== undefined) {
        productionStore.productionSheets[index][field] = data[field]
      }
      
      // 성공 메시지 (짧게)
      const toast = document.createElement('div')
      toast.textContent = '저장되었습니다'
      toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 8px 16px; border-radius: 6px; z-index: 9999; font-size: 14px;'
      document.body.appendChild(toast)
      setTimeout(() => document.body.removeChild(toast), 2000)
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    alert('예상치 못한 오류가 발생했습니다.')
    return
  }
  
  cancelEdit()
}

// Enter 키 핸들러
const handleCharactersEnter = async (scene) => {
  await saveCharactersEdit(scene)
}

// Blur 핸들러
const handleCharactersBlur = async (scene) => {
  // Enter 키로 인한 blur 이벤트는 무시
  if (editingCell.value === null) {
    return
  }
  await saveCharactersEdit(scene)
}

const saveCharactersEdit = async (scene) => {
  // 이미 저장 중이면 무시
  if (isSaving.value) {
    console.log('Already saving, ignoring duplicate call')
    return
  }
  
  // 쉼표로 구분된 문자열을 배열로 변환
  const newCharacters = editedValue.value
    .split(',')
    .map(char => char.trim())
    .filter(char => char.length > 0)
  
  // 변경사항이 없으면 취소
  const oldCharacters = scene.characters || []
  if (JSON.stringify(newCharacters) === JSON.stringify(oldCharacters)) {
    cancelEdit()
    return
  }
  
  isSaving.value = true
  console.log('Saving characters as array:', newCharacters)
  console.log('Scene ID:', scene.id)
  
  try {
    // PostgreSQL TEXT[] 배열로 저장
    const { data, error } = await supabase
      .from('production_sheets')
      .update({ 
        characters: newCharacters  // JavaScript 배열이 자동으로 PostgreSQL 배열로 변환됨
      })
      .eq('id', scene.id)
      .select()
      .single()
    
    console.log('Supabase response:', { data, error })
    
    if (error) {
      console.error('Supabase error:', error)
      alert('캐릭터 저장에 실패했습니다: ' + error.message)
    } else {
      console.log('Characters saved successfully:', data.characters)
      console.log('Full scene data after save:', data)
      
      // 로컬 상태 업데이트 - characters만 업데이트
      if (data.characters !== undefined) {
        scene.characters = data.characters
      }
      
      // Store 상태도 업데이트 - characters만 업데이트
      const index = productionStore.productionSheets.findIndex(sheet => sheet.id === scene.id)
      if (index !== -1 && data.characters !== undefined) {
        productionStore.productionSheets[index].characters = data.characters
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    alert('예상치 못한 오류가 발생했습니다.')
  } finally {
    cancelEdit()  // editingCell을 null로 만들어서 blur 이벤트가 무시되도록 함
    setTimeout(() => {
      isSaving.value = false  // 약간의 지연 후 플래그 해제
    }, 100)
  }
}

const saveBackgroundsEdit = async (scene) => {
  if (isSaving.value || !editingCell.value) {
    return
  }
  
  const newBackgrounds = editedValue.value
    .split(',')
    .map(bg => bg.trim())
    .filter(bg => bg.length > 0)
  
  const oldBackgrounds = scene.backgrounds || []
  if (JSON.stringify(newBackgrounds) === JSON.stringify(oldBackgrounds)) {
    cancelEdit()
    return
  }
  
  isSaving.value = true
  
  try {
    const { data, error } = await supabase
      .from('production_sheets')
      .update({ 
        backgrounds: newBackgrounds
      })
      .eq('id', scene.id)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      alert('배경 저장에 실패했습니다: ' + error.message)
    } else {
      if (data.backgrounds !== undefined) {
        scene.backgrounds = data.backgrounds
      }
      
      const index = productionStore.productionSheets.findIndex(sheet => sheet.id === scene.id)
      if (index !== -1 && data.backgrounds !== undefined) {
        productionStore.productionSheets[index].backgrounds = data.backgrounds
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    alert('예상치 못한 오류가 발생했습니다.')
  } finally {
    cancelEdit()
    setTimeout(() => {
      isSaving.value = false
    }, 100)
  }
}

const savePropsEdit = async (scene) => {
  if (isSaving.value || !editingCell.value) {
    return
  }
  
  const newProps = editedValue.value
    .split(',')
    .map(prop => prop.trim())
    .filter(prop => prop.length > 0)
  
  const oldProps = scene.props || []
  if (JSON.stringify(newProps) === JSON.stringify(oldProps)) {
    cancelEdit()
    return
  }
  
  isSaving.value = true
  
  try {
    const { data, error } = await supabase
      .from('production_sheets')
      .update({ 
        props: newProps
      })
      .eq('id', scene.id)
      .select()
      .single()
    
    if (error) {
      console.error('Supabase error:', error)
      alert('소품 저장에 실패했습니다: ' + error.message)
    } else {
      if (data.props !== undefined) {
        scene.props = data.props
      }
      
      const index = productionStore.productionSheets.findIndex(sheet => sheet.id === scene.id)
      if (index !== -1 && data.props !== undefined) {
        productionStore.productionSheets[index].props = data.props
      }
    }
  } catch (err) {
    console.error('Unexpected error:', err)
    alert('예상치 못한 오류가 발생했습니다.')
  } finally {
    cancelEdit()
    setTimeout(() => {
      isSaving.value = false
    }, 100)
  }
}

const cancelEdit = () => {
  // 타임아웃 정리
  if (editTimeout.value) {
    clearTimeout(editTimeout.value)
    editTimeout.value = null
  }
  
  editingCell.value = null
  editedValue.value = ''
  originalValue.value = ''
  hasUnsavedChanges.value = false
}

const isEditing = (sceneId, field) => {
  return editingCell.value === `${sceneId}-${field}`
}

// 연출가이드 편집 관련 함수들
const startEditingDirectorGuide = (sceneId, directorGuide) => {
  editingCell.value = `${sceneId}-director_guide`
  editedValue.value = directorGuide || ''
  nextTick(() => {
    const textarea = document.querySelector(`#edit-${sceneId}-director-guide`)
    if (textarea) {
      textarea.focus()
      textarea.setSelectionRange(textarea.value.length, textarea.value.length)
    }
  })
}

const handleDirectorGuideEnter = async (scene) => {
  await saveDirectorGuideEdit(scene)
}

const handleDirectorGuideBlur = async (scene) => {
  if (editingCell.value === null) {
    return
  }
  await saveDirectorGuideEdit(scene)
}

const saveDirectorGuideEdit = async (scene) => {
  if (isSaving.value) {
    return
  }
  
  isSaving.value = true
  
  try {
    const newDirectorGuide = editedValue.value.trim()
    
    const { data, error } = await supabase
      .from('production_sheets')
      .update({ 
        director_guide: newDirectorGuide
      })
      .eq('id', scene.id)
      .select()
      .single()
    
    if (error) {
      console.error('연출가이드 저장 오류:', error)
      alert('연출가이드 저장에 실패했습니다: ' + error.message)
    } else {
      scene.director_guide = data.director_guide
      
      const index = productionStore.productionSheets.findIndex(sheet => sheet.id === scene.id)
      if (index !== -1) {
        productionStore.productionSheets[index].director_guide = data.director_guide
      }
    }
  } catch (err) {
    console.error('연출가이드 저장 오류:', err)
    alert('예상치 못한 오류가 발생했습니다.')
  } finally {
    cancelEdit()
    setTimeout(() => {
      isSaving.value = false
    }, 100)
  }
}

// scene_type 추출 함수
const getSceneType = (scene) => {
  // metadata.scene_type이 있으면 사용
  if (scene.metadata && scene.metadata.scene_type) {
    return scene.metadata.scene_type
  }
  return 'mixed' // 기본값
}

// scene_type CSS 클래스 함수
const getSceneTypeClass = (scene) => {
  const sceneType = getSceneType(scene)
  switch (sceneType) {
    case '그래픽': return 'scene-type-graphics'
    case 'CG': return 'scene-type-cg'
    case '자료영상': return 'scene-type-archive'
    case '애니메이션': return 'scene-type-animation'
    default: return 'scene-type-mixed'
  }
}

// reference_sources 추출 함수
const getReferenceSources = (scene) => {
  // metadata.reference_sources가 있으면 사용
  if (scene.metadata && scene.metadata.reference_sources && Array.isArray(scene.metadata.reference_sources)) {
    return scene.metadata.reference_sources.filter(source => source && source !== '-')
  }
  return []
}

// 에셋 검사 함수 (필터링 조건 고려)
const hasAnyAssets = (scene) => {
  const hasReferenceSources = getReferenceSources(scene).length > 0
  
  const hasCharacters = assetFilter.value.characters && (scene.characters && scene.characters.length > 0)
  const hasBackgrounds = assetFilter.value.backgrounds && (scene.backgrounds && scene.backgrounds.length > 0)
  const hasProps = assetFilter.value.props && (scene.props && scene.props.length > 0)
  const hasReferenceData = assetFilter.value.referenceSources && (
    (scene.reference_keywords && scene.reference_keywords.length > 0) || hasReferenceSources
  )
  
  return hasCharacters || hasBackgrounds || hasProps || hasReferenceData
}

// 에셋 관련 새로운 함수들
const getEmptyAssetHintText = () => {
  const activeFilters = getActiveFilterCount()
  if (activeFilters === 1) {
    const activeFilter = getSingleActiveFilter()
    return `${activeFilter} 추가하기`
  }
  return '에셋 정보 없음'
}

const getActiveFilterCount = () => {
  let count = 0
  if (assetFilter.value.characters) count++
  if (assetFilter.value.backgrounds) count++
  if (assetFilter.value.props) count++
  if (assetFilter.value.referenceSources) count++
  return count
}

const getSingleActiveFilter = () => {
  if (assetFilter.value.characters) return '캐릭터'
  if (assetFilter.value.backgrounds) return '배경'
  if (assetFilter.value.props) return '소품'
  if (assetFilter.value.referenceSources) return '참고자료'
  return ''
}

const handleEmptyAssetClick = (scene) => {
  const activeFilters = getActiveFilterCount()
  if (activeFilters !== 1) {
    return // 필터가 정확히 하나만 활성화된 경우에만 처리
  }
  
  const activeFilter = getSingleActiveFilter()
  
  // 각 에셋 타입별로 인라인 편집 시작
  if (activeFilter === '캐릭터') {
    startCharactersEdit(scene)
  } else if (activeFilter === '배경') {
    startBackgroundsEdit(scene)
  } else if (activeFilter === '소품') {
    startPropsEdit(scene)
  }
  // 참고자료는 자동 추출이므로 수동 편집 비활성화
}

// 시퀀스는 자동 생성되므로 편집 기능 없음

// 호버 관련 함수들
const setHoveredItem = (itemId) => {
  hoveredItemId.value = itemId
}

const clearHoveredItem = () => {
  hoveredItemId.value = null
}

// 씬 추가 함수 (Netlify Function 사용)
const addRow = async (afterSceneNumber) => {
  try {
    // 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }
    
    console.log('Adding scene after scene number:', afterSceneNumber)
    
    // Netlify Function 호출
    const response = await fetch('/.netlify/functions/addProductionSheetRow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        projectId: props.projectId,
        afterSceneNumber: afterSceneNumber
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('씬 추가 실패:', error)
      
      // 중복 키 오류인 경우 재시도
      if (error.error && error.error.includes('duplicate key')) {
        console.log('Duplicate key error detected, refreshing and retrying...')
        
        // 먼저 최신 데이터 가져오기
        await productionStore.fetchProductionSheets(props.projectId)
        
        // 마지막 씬 번호 찾기
        const maxSceneNumber = Math.max(...props.scenes.map(s => s.scene_number || 0))
        
        // 마지막에 추가
        const retryResponse = await fetch('/.netlify/functions/addProductionSheetRow', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            projectId: props.projectId,
            afterSceneNumber: maxSceneNumber
          })
        })
        
        if (!retryResponse.ok) {
          const retryError = await retryResponse.json()
          console.error('재시도 실패:', retryError)
          alert('씬 추가에 실패했습니다. 페이지를 새로고침 후 다시 시도해주세요.')
          return
        }
      } else {
        alert(`씬 추가에 실패했습니다: ${error.error || '알 수 없는 오류'}`)
        return
      }
    }
    
    // 프로덕션 시트 다시 로드
    await productionStore.fetchProductionSheets(props.projectId)
  } catch (err) {
    console.error('씬 추가 중 오류:', err)
    alert('씬 추가 중 오류가 발생했습니다.')
  }
}

// Shift+Enter로 씬 분할
const splitSceneAtCursor = async (scene) => {
  const textarea = document.getElementById(`edit-${scene.id}-original_script_text`)
  if (!textarea) return
  
  const cursorPosition = textarea.selectionStart
  const fullText = editedValue.value
  
  // 커서 위치에서 텍스트 분할
  const beforeText = fullText.substring(0, cursorPosition).trim()
  const afterText = fullText.substring(cursorPosition).trim()
  
  if (!beforeText || !afterText) {
    // 분할할 텍스트가 없으면 일반 저장
    await saveEdit(scene, 'original_script_text')
    return
  }
  
  try {
    const session = await supabase.auth.getSession()
    if (!session.data.session) {
      alert('로그인이 필요합니다.')
      return
    }
    
    // 1. 먼저 현재 씬을 커서 앞부분으로 업데이트 (ID로 직접 업데이트하므로 안전)
    const { error: updateError } = await supabase
      .from('production_sheets')
      .update({ original_script_text: beforeText })
      .eq('id', scene.id)
    
    if (updateError) {
      console.error('씬 업데이트 실패:', updateError)
      alert('씬 업데이트에 실패했습니다.')
      return
    }
    
    // 2. 그 다음 새 씬 추가 (커서 뒷부분)
    const newSceneData = {
      projectId: props.projectId,
      afterSceneNumber: scene.scene_number,
      scriptText: afterText,
      characters: extractCharacters(afterText)
    }
    
    const response = await fetch('/.netlify/functions/addProductionSheetRow', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.data.session.access_token}`
      },
      body: JSON.stringify(newSceneData)
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('씬 분할 실패:', error)
      alert('씬 분할에 실패했습니다.')
      
      // 새 씬 추가 실패 시 원래 텍스트로 복구
      await supabase
        .from('production_sheets')
        .update({ original_script_text: fullText })
        .eq('id', scene.id)
      
      return
    }
    
    // 3. 편집 모드 종료
    cancelEdit()
    
    // 4. 프로덕션 시트 다시 로드
    await productionStore.fetchProductionSheets(props.projectId)
    
  } catch (err) {
    console.error('씬 분할 중 오류:', err)
    alert('씬 분할 중 오류가 발생했습니다.')
  }
}

// 간단한 캐릭터 추출 함수
const extractCharacters = (text) => {
  const characters = []
  
  // "캐릭터명 |" 패턴 찾기 (대화 부분은 제외)
  const lines = text.split('\n')
  for (const line of lines) {
    const match = line.match(/^([가-힣A-Za-z0-9\s]+)\s*\|/)
    if (match) {
      const name = match[1].trim()
      if (name && !characters.includes(name)) {
        characters.push(name)
      }
    }
  }
  
  return characters
}

// 선택 해제
const clearSelection = () => {
  emit('update:selected', [])
}

// 에셋 필터 드롭다운 토글
const toggleAssetFilterDropdown = () => {
  showAssetFilterDropdown.value = !showAssetFilterDropdown.value
}

// 드롭다운 외부 클릭 시 닫기
const handleClickOutside = (event) => {
  const dropdown = event.target.closest('.asset-filter-dropdown')
  if (!dropdown) {
    showAssetFilterDropdown.value = false
  }
}

// 씬 삭제 함수 (Netlify Function 사용)
const deleteSelectedScenes = async () => {
  if (props.selectedScenes.length === 0) {
    alert('삭제할 씬을 선택해주세요.')
    return
  }
  
  if (!confirm(`선택한 ${props.selectedScenes.length}개의 씬을 삭제하시겠습니까?`)) {
    return
  }
  
  try {
    // 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }
    
    // Netlify Function 호출
    const response = await fetch('/.netlify/functions/deleteProductionSheetRows', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        projectId: props.projectId,
        idsToDelete: props.selectedScenes
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      console.error('씬 삭제 실패:', error)
      alert(`씬 삭제에 실패했습니다: ${error.error || '알 수 없는 오류'}`)
      return
    }
    
    // 선택 해제 및 프로덕션 시트 다시 로드
    emit('update:selected', [])
    await productionStore.fetchProductionSheets(props.projectId)
  } catch (err) {
    console.error('씬 삭제 중 오류:', err)
    alert('씬 삭제 중 오류가 발생했습니다.')
  }
}

// Duration 포맷 함수
const formatDuration = (seconds) => {
  if (!seconds) return '0:00'
  const totalSeconds = Math.round(seconds) // 반올림
  const mins = Math.floor(totalSeconds / 60)
  const secs = totalSeconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 텍스트 파싱 함수
const parseTextForTTS = (text) => {
  let processedText = text
  
  // 1. 괄호 안 내용 제거 (지시문, 연출 노트 등)
  processedText = processedText.replace(/\([^)]*\)/g, '')
  processedText = processedText.replace(/\[[^\]]*\]/g, '')
  processedText = processedText.replace(/\{[^}]*\}/g, '')
  
  // 2. 이모지 및 특수 유니코드 문자 제거
  processedText = processedText.replace(/[\u{1F600}-\u{1F64F}]/gu, '') // 이모티콘
  processedText = processedText.replace(/[\u{1F300}-\u{1F5FF}]/gu, '') // 기타 기호
  processedText = processedText.replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // 교통/지도 기호
  processedText = processedText.replace(/[\u{2600}-\u{26FF}]/gu, '')   // 기타 기호
  processedText = processedText.replace(/[\u{2700}-\u{27BF}]/gu, '')   // 딩뱃
  
  // 3. 따옴표 제거 (대화문 표시용 따옴표 모두 제거)
  processedText = processedText.replace(/[""""]/g, '') // 큰따옴표 제거
  processedText = processedText.replace(/['''']/g, '') // 작은따옴표 제거
  processedText = processedText.replace(/[「」『』]/g, '') // 일본어 따옴표 제거
  processedText = processedText.replace(/[《》〈〉]/g, '') // 중국어 따옴표 제거
  processedText = processedText.replace(/[｢｣]/g, '') // 반각 따옴표 제거
  processedText = processedText.replace(/[`´]/g, '') // 백틱과 억음 부호 제거
  
  // 4. 특수 문자 처리
  processedText = processedText.replace(/[♪♫♬♭♮♯]/g, '') // 음악 기호
  processedText = processedText.replace(/[★☆♥♡]/g, '') // 별, 하트 등
  processedText = processedText.replace(/[※▶◀■□▲△▼▽○●◎◇◆]/g, '') // 도형
  
  // 5. 연속된 특수 문자 정리
  processedText = processedText.replace(/[!?]{2,}/g, match => match[0]) // 연속된 느낌표/물음표를 하나로
  processedText = processedText.replace(/\.{3,}/g, '...') // 연속된 마침표를 ...로
  processedText = processedText.replace(/[~]{2,}/g, '~') // 연속된 물결표를 하나로
  
  // 6. 줄바꿈 및 공백 정리
  processedText = processedText.replace(/\n{3,}/g, '\n\n') // 3개 이상의 줄바꿈을 2개로
  processedText = processedText.replace(/\s+/g, ' ') // 연속된 공백을 하나로
  processedText = processedText.trim() // 앞뒤 공백 제거
  
  return processedText
}

// TTS 생성 함수
const generateTTS = async (scene, regenerate = false) => {
  if (!scene.original_script_text) {
    alert('스크립트 텍스트가 없습니다.')
    return
  }
  
  // 텍스트 파싱 (클라이언트에서 미리 확인)
  const parsedText = parseTextForTTS(scene.original_script_text)
  if (!parsedText || parsedText.length === 0) {
    alert('텍스트 처리 후 내용이 없습니다. 스크립트를 확인해주세요.')
    return
  }
  
  try {
    // 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }
    
    loadingTTS.value[scene.id] = true
    
    // TTS 생성 API 호출 (원본 텍스트를 보내고 서버에서 파싱)
    const response = await fetch('/.netlify/functions/generateTTS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        projectId: props.projectId,
        sceneId: scene.id,
        text: scene.original_script_text // 원본 텍스트를 보냄 (서버에서 파싱)
      })
    })
    
    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'TTS 생성에 실패했습니다.')
    }
    
    const result = await response.json()
    console.log('TTS generated:', result)
    
    // 오디오 요소 생성 및 duration 계산
    if (!audioElements.value[scene.id]) {
      audioElements.value[scene.id] = new Audio()
    }
    const audio = audioElements.value[scene.id]
    audio.src = result.data.file_url
    
    // 오디오 메타데이터 로드 대기하여 duration 얻기
    await new Promise((resolve) => {
      audio.addEventListener('loadedmetadata', () => {
        // TTS 데이터 저장
        ttsData.value[scene.id] = {
          file_url: result.data.file_url,
          duration: audio.duration,
          version: result.data.version
        }
        
        // Duration을 데이터베이스에 저장
        saveTTSDuration(scene.id, audio.duration, result.data.version)
        resolve()
      }, { once: true })
      
      audio.load()
    })
    
    if (regenerate) {
      alert('TTS가 재생성되었습니다.')
    } else {
      alert('TTS가 성공적으로 생성되었습니다.')
    }
  } catch (error) {
    console.error('TTS 생성 오류:', error)
    alert(`TTS 생성 실패: ${error.message}`)
  } finally {
    loadingTTS.value[scene.id] = false
  }
}

// TTS duration 저장 함수
const saveTTSDuration = async (sceneId, duration, version) => {
  try {
    const { error } = await supabase
      .from('tts_audio')
      .update({ duration })
      .eq('scene_id', sceneId)
      .eq('version', version || 1)
    
    if (error) {
      console.error('Duration 저장 실패:', error)
    }
  } catch (err) {
    console.error('Duration 저장 오류:', err)
  }
}

// TTS 일괄 듣기 기능
let currentAudioPlayer = null
let ttsPlaylist = []
let currentTrackIndex = 0

// TTS 플레이어 상태
const showTTSPlayer = ref(false)
const isPlaying = ref(false)
const isPaused = ref(false)
const currentTrack = ref(null)
const playlistProgress = ref({ current: 0, total: 0 })
const currentTime = ref(0)
const duration = ref(0)
const totalPlaylistDuration = ref(0)
const playlistCurrentTime = ref(0)

const playBatchTTS = async () => {
  if (props.selectedScenes.length === 0) {
    alert('TTS를 들을 씬을 선택해주세요.')
    return
  }
  
  console.log('선택된 씬들:', props.selectedScenes)
  console.log('전체 씬 데이터:', props.scenes)
  
  // 선택된 씬들 중 TTS가 있는 씬만 필터링
  const scenesWithTTS = []
  for (const sceneId of props.selectedScenes) {
    const scene = props.scenes.find(s => s.id === sceneId)
    console.log(`씬 ${sceneId}:`, scene)
    console.log(`TTS URL:`, scene?.tts_audio_url)
    
    if (scene && scene.tts_audio_url) {
      scenesWithTTS.push({
        id: scene.id,
        sceneNumber: scene.scene_number,
        text: scene.original_script_text,
        audioUrl: scene.tts_audio_url
      })
    }
  }
  
  console.log('TTS가 있는 씬들:', scenesWithTTS)
  
  if (scenesWithTTS.length === 0) {
    // TTS가 없으면 먼저 생성하도록 안내
    const confirmGenerate = confirm('선택된 씬에 TTS가 없습니다. TTS를 먼저 생성하시겠습니까?')
    if (confirmGenerate) {
      generateBatchTTS()
    }
    return
  }
  
  // 씬 번호순으로 정렬
  scenesWithTTS.sort((a, b) => a.sceneNumber - b.sceneNumber)
  
  // 플레이리스트 설정
  ttsPlaylist = scenesWithTTS
  currentTrackIndex = 0
  
  // 플레이어 UI 표시
  showTTSPlayer.value = true
  playlistProgress.value = { current: 1, total: scenesWithTTS.length }
  
  // 전체 재생 시간 계산
  await calculateTotalDuration()
  
  // 재생 시작
  playNextTrack()
}

const playNextTrack = () => {
  if (currentTrackIndex >= ttsPlaylist.length) {
    console.log('TTS 일괄 재생 완료')
    closeTTSPlayer()
    return
  }
  
  const track = ttsPlaylist[currentTrackIndex]
  console.log(`재생 중: 씬 ${track.sceneNumber} - ${track.text.substring(0, 50)}...`)
  
  // 현재 트랙 정보 업데이트
  currentTrack.value = track
  playlistProgress.value.current = currentTrackIndex + 1
  currentTime.value = 0
  duration.value = 0
  
  // 기존 플레이어 정리
  if (currentAudioPlayer) {
    currentAudioPlayer.pause()
    currentAudioPlayer.removeEventListener('ended', onTrackEnded)
    currentAudioPlayer.removeEventListener('error', onTrackError)
    currentAudioPlayer.removeEventListener('timeupdate', onTimeUpdate)
    currentAudioPlayer.removeEventListener('loadedmetadata', onLoadedMetadata)
  }
  
  // 새 오디오 플레이어 생성
  currentAudioPlayer = new Audio(track.audioUrl)
  currentAudioPlayer.addEventListener('ended', onTrackEnded)
  currentAudioPlayer.addEventListener('error', onTrackError)
  currentAudioPlayer.addEventListener('timeupdate', onTimeUpdate)
  currentAudioPlayer.addEventListener('loadedmetadata', onLoadedMetadata)
  
  // 재생
  currentAudioPlayer.play().then(() => {
    isPlaying.value = true
    isPaused.value = false
  }).catch(error => {
    console.error('Audio play error:', error)
    // 에러 발생 시 다음 트랙으로
    currentTrackIndex++
    playNextTrack()
  })
}

const onTrackEnded = () => {
  currentTrackIndex++
  playNextTrack()
}

const onTrackError = (error) => {
  console.error('Audio error:', error)
  currentTrackIndex++
  playNextTrack()
}

const onTimeUpdate = () => {
  if (currentAudioPlayer) {
    currentTime.value = currentAudioPlayer.currentTime
    updatePlaylistCurrentTime()
  }
}

const onLoadedMetadata = () => {
  if (currentAudioPlayer) {
    duration.value = currentAudioPlayer.duration
  }
}

// 플레이어 제어 함수들
const togglePlayPause = () => {
  if (!currentAudioPlayer) return
  
  if (isPlaying.value) {
    currentAudioPlayer.pause()
    isPlaying.value = false
    isPaused.value = true
  } else {
    currentAudioPlayer.play()
    isPlaying.value = true
    isPaused.value = false
  }
}

const playPrevious = () => {
  if (currentTrackIndex > 0) {
    currentTrackIndex--
    playNextTrack()
  }
}

const playNext = () => {
  if (currentTrackIndex < ttsPlaylist.length - 1) {
    currentTrackIndex++
    playNextTrack()
  }
}

const closeTTSPlayer = () => {
  showTTSPlayer.value = false
  isPlaying.value = false
  isPaused.value = false
  currentTrack.value = null
  
  if (currentAudioPlayer) {
    currentAudioPlayer.pause()
    currentAudioPlayer.removeEventListener('ended', onTrackEnded)
    currentAudioPlayer.removeEventListener('error', onTrackError)
    currentAudioPlayer.removeEventListener('timeupdate', onTimeUpdate)
    currentAudioPlayer.removeEventListener('loadedmetadata', onLoadedMetadata)
    currentAudioPlayer = null
  }
}

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00'
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// 전체 재생 시간 계산
const calculateTotalDuration = async () => {
  totalPlaylistDuration.value = 0
  
  const promises = ttsPlaylist.map((track, index) => {
    return new Promise((resolve) => {
      const audio = new Audio(track.audioUrl)
      audio.addEventListener('loadedmetadata', () => {
        if (audio.duration && !isNaN(audio.duration)) {
          track.duration = audio.duration
          totalPlaylistDuration.value += audio.duration
        }
        resolve()
      })
      audio.addEventListener('error', () => {
        track.duration = 0
        resolve()
      })
    })
  })
  
  await Promise.all(promises)
}

// 플레이리스트 전체 진행 시간 업데이트
const updatePlaylistCurrentTime = () => {
  let elapsed = 0
  
  // 이전 트랙들의 시간 합계
  for (let i = 0; i < currentTrackIndex; i++) {
    if (ttsPlaylist[i].duration) {
      elapsed += ttsPlaylist[i].duration
    }
  }
  
  // 현재 트랙의 진행 시간 추가
  elapsed += currentTime.value
  
  playlistCurrentTime.value = elapsed
}

// 타임라인에서 특정 시간으로 점프
const seekToPlaylistTime = (targetTime) => {
  let elapsed = 0
  let targetTrackIndex = 0
  let targetTrackTime = 0
  
  // 목표 시간이 어느 트랙에 있는지 찾기
  for (let i = 0; i < ttsPlaylist.length; i++) {
    const trackDuration = ttsPlaylist[i].duration || 0
    
    if (elapsed + trackDuration >= targetTime) {
      targetTrackIndex = i
      targetTrackTime = targetTime - elapsed
      break
    }
    
    elapsed += trackDuration
  }
  
  // 해당 트랙으로 이동
  if (targetTrackIndex !== currentTrackIndex) {
    currentTrackIndex = targetTrackIndex
    playNextTrack()
    
    // 메타데이터 로드 후 시간 점프
    setTimeout(() => {
      if (currentAudioPlayer && targetTrackTime > 0) {
        currentAudioPlayer.currentTime = targetTrackTime
      }
    }, 100)
  } else if (currentAudioPlayer) {
    currentAudioPlayer.currentTime = targetTrackTime
  }
}

// 타임라인 클릭 이벤트
const timelineBarRef = ref(null)

const onTimelineClick = (event) => {
  if (!timelineBarRef.value || !totalPlaylistDuration.value) return
  
  const rect = timelineBarRef.value.getBoundingClientRect()
  const clickX = event.clientX - rect.left
  const percentage = clickX / rect.width
  const targetTime = percentage * totalPlaylistDuration.value
  
  seekToPlaylistTime(targetTime)
}

// 특정 트랙으로 점프
const jumpToTrack = (trackIndex) => {
  if (trackIndex === currentTrackIndex) return
  
  currentTrackIndex = trackIndex
  playNextTrack()
}

// 컴포넌트 언마운트 시 오디오 정리
onUnmounted(() => {
  closeTTSPlayer()
})

const generateBatchTTS = async () => {
  if (props.selectedScenes.length === 0) {
    alert('TTS를 생성할 씬을 선택해주세요.')
    return
  }
  
  // 선택된 씬들 중 스크립트가 있는 씬만 필터링
  const scenesWithScript = props.scenes
    .filter(scene => {
      if (!props.selectedScenes.includes(scene.id) || !scene.original_script_text) {
        return false
      }
      // 파싱 후 텍스트가 있는지 확인
      const parsed = parseTextForTTS(scene.original_script_text)
      return parsed && parsed.length > 0
    })
  
  if (scenesWithScript.length === 0) {
    alert('선택된 씬에 유효한 스크립트가 없습니다.')
    return
  }
  
  const confirmMessage = `${scenesWithScript.length}개 씬의 TTS를 생성하시겠습니까?`
  if (!confirm(confirmMessage)) {
    return
  }
  
  try {
    // 토큰 가져오기
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      alert('로그인이 필요합니다.')
      return
    }
    
    // 모든 씬에 대해 로딩 상태 설정
    scenesWithScript.forEach(scene => {
      loadingTTS.value[scene.id] = true
    })
    
    // ElevenLabs API는 동시에 5개까지만 허용하므로 배치로 나누어 처리
    const batchSize = 5
    const batches = []
    
    for (let i = 0; i < scenesWithScript.length; i += batchSize) {
      batches.push(scenesWithScript.slice(i, i + batchSize))
    }
    
    const allResults = []
    
    // 각 배치를 순차적으로 처리
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`배치 ${batchIndex + 1}/${batches.length} 처리 중 (${batch.length}개 씬)`)
      
      // 현재 배치의 TTS 생성 요청들 (배치 내에서는 병렬 처리)
      const batchPromises = batch.map(async (scene) => {
        try {
          const response = await fetch('/.netlify/functions/generateTTS', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              projectId: props.projectId,
              sceneId: scene.id,
              text: scene.original_script_text
            })
          })
          
          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'TTS 생성에 실패했습니다.')
          }
          
          const result = await response.json()
          
          // 오디오 요소 생성 및 duration 계산
          if (!audioElements.value[scene.id]) {
            audioElements.value[scene.id] = new Audio()
          }
          const audio = audioElements.value[scene.id]
          audio.src = result.data.file_url
          
          // 오디오 메타데이터 로드 대기
          await new Promise((resolve) => {
            audio.addEventListener('loadedmetadata', () => {
              // TTS 데이터 저장
              ttsData.value[scene.id] = {
                file_url: result.data.file_url,
                duration: audio.duration,
                version: result.data.version
              }
              
              // Duration을 데이터베이스에 저장
              saveTTSDuration(scene.id, audio.duration, result.data.version)
              
              resolve()
            }, { once: true })
            
            audio.load()
          })
          
          return { success: true, sceneId: scene.id, sceneNumber: scene.scene_number }
        } catch (error) {
          console.error(`씬 ${scene.scene_number} TTS 생성 실패:`, error)
          return { success: false, sceneId: scene.id, sceneNumber: scene.scene_number, error: error.message }
        } finally {
          loadingTTS.value[scene.id] = false
        }
      })
      
      // 현재 배치의 모든 요청이 완료될 때까지 대기
      const batchResults = await Promise.allSettled(batchPromises)
      allResults.push(...batchResults)
      
      console.log(`배치 ${batchIndex + 1} 완료: ${batchResults.filter(r => r.value?.success).length}개 성공`)
      
      // 다음 배치 처리 전 1초 대기 (API 제한 회피)
      if (batchIndex < batches.length - 1) {
        console.log('다음 배치 처리 전 대기 중...')
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }
    
    // 모든 결과를 results에 할당
    const results = allResults
    
    // 결과 집계
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length
    const failCount = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && !r.value.success)).length
    
    // 선택 해제
    clearSelection()
    
    // 결과 알림
    if (failCount === 0) {
      alert(`${successCount}개 씬의 TTS가 성공적으로 생성되었습니다.`)
    } else {
      alert(`TTS 생성 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    }
    
  } catch (error) {
    console.error('일괄 TTS 생성 오류:', error)
    alert(`일괄 TTS 생성 실패: ${error.message}`)
    
    // 모든 로딩 상태 해제
    scenesWithScript.forEach(scene => {
      loadingTTS.value[scene.id] = false
    })
  }
}

// TTS 일괄 다운로드 함수
const downloadBatchTTS = async () => {
  if (props.selectedScenes.length === 0) {
    alert('다운로드할 TTS를 선택해주세요.')
    return
  }
  
  // 선택된 씬들 중 TTS가 있는 씬만 필터링
  const scenesWithTTS = props.scenes.filter(scene => {
    return props.selectedScenes.includes(scene.id) && ttsData.value[scene.id]?.file_url
  })
  
  if (scenesWithTTS.length === 0) {
    alert('선택된 씬에 다운로드 가능한 TTS가 없습니다.')
    return
  }
  
  try {
    // 프로젝트 정보 가져오기 - currentProject가 없으면 직접 가져오기
    let projectName = projectsStore.currentProject?.name
    
    if (!projectName) {
      // projectId로 프로젝트 정보 가져오기
      await projectsStore.getProject(props.projectId)
      projectName = projectsStore.currentProject?.name || 'project'
    }
    
    // ZIP 파일 생성
    const zip = new JSZip()
    
    // 각 TTS 파일 다운로드 및 ZIP에 추가
    const downloadPromises = scenesWithTTS.map(async (scene) => {
      try {
        const tts = ttsData.value[scene.id]
        const response = await fetch(tts.file_url)
        
        if (!response.ok) {
          throw new Error(`Failed to download TTS for scene ${scene.scene_number}`)
        }
        
        const blob = await response.blob()
        const fileName = `TTS_${projectName}_${scene.scene_number}.mp3`
        
        // ZIP에 파일 추가
        zip.file(fileName, blob)
        
        return { success: true, sceneNumber: scene.scene_number }
      } catch (error) {
        console.error(`Scene ${scene.scene_number} TTS download failed:`, error)
        return { success: false, sceneNumber: scene.scene_number, error: error.message }
      }
    })
    
    // 모든 다운로드 완료 대기
    const results = await Promise.allSettled(downloadPromises)
    const successCount = results.filter(r => r.value?.success).length
    const failCount = results.filter(r => !r.value?.success).length
    
    if (successCount === 0) {
      alert('다운로드 가능한 TTS 파일이 없습니다.')
      return
    }
    
    // ZIP 파일 생성 및 다운로드
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `TTS_${projectName}_batch.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    // 결과 알림
    if (failCount > 0) {
      alert(`TTS 다운로드 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    } else {
      alert(`${successCount}개 TTS 파일이 다운로드되었습니다.`)
    }
    
    // 선택 해제
    clearSelection()
    
  } catch (error) {
    console.error('TTS 일괄 다운로드 오류:', error)
    alert(`TTS 다운로드 실패: ${error.message}`)
  }
}

// 이미지 일괄 다운로드 함수
const downloadBatchImages = async () => {
  if (props.selectedScenes.length === 0) {
    alert('다운로드할 씬을 선택해주세요.')
    return
  }
  
  // 선택된 씬들 중 이미지가 있는 씬만 필터링
  const scenesWithImages = props.scenes.filter(scene => {
    return props.selectedScenes.includes(scene.id) && scene.scene_image_url
  })
  
  if (scenesWithImages.length === 0) {
    alert('선택된 씬에 다운로드 가능한 이미지가 없습니다.')
    return
  }
  
  try {
    // 프로젝트 정보 가져오기
    let projectName = projectsStore.currentProject?.name
    
    if (!projectName) {
      await projectsStore.getProject(props.projectId)
      projectName = projectsStore.currentProject?.name || 'project'
    }
    
    // ZIP 파일 생성
    const zip = new JSZip()
    
    // 각 이미지 파일 다운로드 및 ZIP에 추가
    const downloadPromises = scenesWithImages.map(async (scene) => {
      try {
        // CORS 문제 회피를 위해 프록시 사용 (Supabase 이미지인 경우)
        let imageUrl = scene.scene_image_url
        
        // 이미지 다운로드
        const response = await fetch(imageUrl, {
          mode: 'cors',
          credentials: 'omit'
        })
        
        if (!response.ok) {
          throw new Error(`Failed to download image for scene ${scene.scene_number}: ${response.status}`)
        }
        
        const blob = await response.blob()
        
        // 파일 확장자 결정 (Content-Type 기반)
        const contentType = response.headers.get('content-type') || 'image/png'
        let extension = 'png'
        if (contentType.includes('jpeg') || contentType.includes('jpg')) {
          extension = 'jpg'
        } else if (contentType.includes('webp')) {
          extension = 'webp'
        } else if (contentType.includes('gif')) {
          extension = 'gif'
        }
        
        const fileName = `image_${projectName}_scene_${String(scene.scene_number).padStart(3, '0')}.${extension}`
        
        // ZIP에 파일 추가
        zip.file(fileName, blob, { binary: true })
        
        console.log(`Successfully added ${fileName} to ZIP`)
        return { success: true, sceneNumber: scene.scene_number, fileName }
      } catch (error) {
        console.error(`Scene ${scene.scene_number} image download failed:`, error)
        return { success: false, sceneNumber: scene.scene_number, error: error.message }
      }
    })
    
    // 모든 다운로드 완료 대기
    const results = await Promise.all(downloadPromises)
    const successResults = results.filter(r => r.success)
    const successCount = successResults.length
    const failCount = results.filter(r => !r.success).length
    
    if (successCount === 0) {
      alert('다운로드 가능한 이미지 파일이 없습니다.')
      return
    }
    
    // ZIP 파일 생성 및 다운로드
    console.log(`Creating ZIP file with ${successCount} images...`)
    const zipBlob = await zip.generateAsync({ 
      type: 'blob',
      compression: "DEFLATE",
      compressionOptions: {
        level: 6  // 압축 레벨 (1-9, 6이 기본값)
      }
    })
    
    // 파일 크기 확인
    const fileSizeMB = (zipBlob.size / (1024 * 1024)).toFixed(2)
    console.log(`ZIP file created: ${fileSizeMB} MB`)
    
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `images_${projectName}_batch_${new Date().getTime()}.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 메모리 정리를 위해 약간의 딜레이 후 revoke
    setTimeout(() => {
      URL.revokeObjectURL(url)
    }, 1000)
    
    // 결과 알림
    if (failCount > 0) {
      alert(`이미지 다운로드 완료: 성공 ${successCount}개, 실패 ${failCount}개`)
    } else {
      alert(`${successCount}개 이미지 파일이 다운로드되었습니다.`)
    }
    
    // 선택 해제
    clearSelection()
    
  } catch (error) {
    console.error('이미지 일괄 다운로드 오류:', error)
    alert(`이미지 다운로드 실패: ${error.message}`)
  }
}

// 비디오 일괄 다운로드 함수
const downloadBatchVideos = async () => {
  if (props.selectedScenes.length === 0) {
    alert('다운로드할 씬을 선택해주세요.')
    return
  }
  
  // 선택된 씬의 비디오 데이터 가져오기 (업스케일 비디오 포함)
  const { data: videoData, error: videoError } = await supabase
    .from('gen_videos')
    .select('scene_id, storage_video_url, upscale_video_url, upscale_status, upscale_factor')
    .in('scene_id', props.selectedScenes)
  
  if (videoError) {
    console.error('비디오 데이터 로드 실패:', videoError)
    alert('비디오 데이터를 불러오는데 실패했습니다.')
    return
  }
  
  // 각 씬의 최적 비디오 찾기 (업스케일된 비디오 우선)
  const bestVideoByScene = {}
  if (videoData) {
    videoData.forEach(video => {
      if (!bestVideoByScene[video.scene_id]) {
        bestVideoByScene[video.scene_id] = video
      } else {
        const currentVideo = bestVideoByScene[video.scene_id]
        // 업스케일된 비디오가 있으면 우선적으로 사용
        if (video.upscale_video_url && video.upscale_status === 'completed') {
          bestVideoByScene[video.scene_id] = video
        } else if (!currentVideo.upscale_video_url && video.storage_video_url) {
          bestVideoByScene[video.scene_id] = video
        }
      }
    })
  }
  
  // 선택된 씬들 중 비디오가 있는 씬만 필터링
  const scenesWithVideos = props.scenes.filter(scene => {
    if (!props.selectedScenes.includes(scene.id)) return false
    
    const video = bestVideoByScene[scene.id]
    const videoUrl = video?.upscale_video_url || video?.storage_video_url || scene.scene_video_url
    
    return videoUrl && videoUrl.trim() !== ''
  }).map(scene => {
    const video = bestVideoByScene[scene.id]
    const videoUrl = video?.upscale_video_url || video?.storage_video_url || scene.scene_video_url
    const isUpscaled = !!(video?.upscale_video_url && video?.upscale_status === 'completed')
    const upscaleFactor = video?.upscale_factor || null
    
    return {
      ...scene,
      bestVideoUrl: videoUrl,
      isUpscaled: isUpscaled,
      upscaleFactor: upscaleFactor
    }
  })
  
  if (scenesWithVideos.length === 0) {
    // 선택된 씬들을 확인하여 더 구체적인 메시지 제공
    const selectedCount = props.selectedScenes.length
    alert(`선택된 ${selectedCount}개 씬에 다운로드 가능한 비디오가 없습니다.\n비디오가 생성된 씬을 선택해주세요.`)
    return
  }
  
  console.log(`Processing ${scenesWithVideos.length} scenes with videos out of ${props.selectedScenes.length} selected`)
  
  try {
    // 프로젝트 정보 가져오기
    let projectName = projectsStore.currentProject?.name
    
    if (!projectName) {
      await projectsStore.getProject(props.projectId)
      projectName = projectsStore.currentProject?.name || 'project'
    }
    
    // ZIP 파일 생성
    const zip = new JSZip()
    
    // 각 비디오 파일 다운로드 및 ZIP에 추가
    const downloadPromises = scenesWithVideos.map(async (scene) => {
      try {
        // 비디오 URL이 없거나 유효하지 않은 경우 건너뛰기
        if (!scene.bestVideoUrl) {
          console.log(`Scene ${scene.scene_number}: No video URL available`)
          return { success: false, sceneNumber: scene.scene_number, error: 'No video URL' }
        }

        // CORS 문제를 피하기 위한 fetch 옵션 설정
        const response = await fetch(scene.bestVideoUrl, {
          mode: 'cors',
          credentials: 'omit',
          cache: 'no-cache'
        })
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const blob = await response.blob()
        
        // blob이 유효한지 확인
        if (!blob || blob.size === 0) {
          throw new Error('Empty or invalid video file')
        }
        
        // 업스케일 표시를 포함한 파일명 생성
        const upscaleTag = scene.isUpscaled ? `-upscaled-${scene.upscaleFactor || '4x'}` : ''
        const fileName = `video_${projectName}_${scene.scene_number}${upscaleTag}.mp4`
        
        // ZIP에 파일 추가
        zip.file(fileName, blob)
        
        return { success: true, sceneNumber: scene.scene_number, isUpscaled: scene.isUpscaled }
      } catch (error) {
        // 에러를 경고로 변경하여 다른 비디오 다운로드는 계속 진행
        console.warn(`Scene ${scene.scene_number} video download skipped:`, error.message)
        return { success: false, sceneNumber: scene.scene_number, error: error.message }
      }
    })
    
    // 모든 다운로드 완료 대기
    const results = await Promise.allSettled(downloadPromises)
    const successCount = results.filter(r => r.value?.success).length
    const failCount = results.filter(r => !r.value?.success).length
    
    if (successCount === 0) {
      alert('다운로드 가능한 비디오 파일이 없습니다.')
      return
    }
    
    // ZIP 파일 생성 및 다운로드
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `videos_${projectName}_batch.zip`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
    
    // 결과 알림 (업스케일 정보 포함)
    const upscaledCount = results.filter(r => r.value?.success && r.value?.isUpscaled).length
    if (failCount > 0) {
      const upscaleMsg = upscaledCount > 0 ? ` (업스케일: ${upscaledCount}개)` : ''
      alert(`비디오 다운로드 완료: 성공 ${successCount}개${upscaleMsg}, 실패 ${failCount}개`)
    } else {
      const upscaleMsg = upscaledCount > 0 ? ` (업스케일: ${upscaledCount}개)` : ''
      alert(`${successCount}개 비디오 파일이 다운로드되었습니다.${upscaleMsg}`)
    }
    
    // 선택 해제
    clearSelection()
    
  } catch (error) {
    console.error('비디오 일괄 다운로드 오류:', error)
    alert(`비디오 다운로드 실패: ${error.message}`)
  }
}

// TTS 다운로드 함수
const downloadTTS = async (scene) => {
  const tts = ttsData.value[scene.id]
  if (!tts || !tts.file_url) {
    alert('TTS 파일이 없습니다.')
    return
  }
  
  try {
    // 프로젝트 이름 가져오기
    const projectName = currentProject.value?.name || 'untitled'
    const sceneNumber = scene.scene_number || 'unknown'
    
    // 버전 정보 가져오기 (tts.version이 있으면 사용, 없으면 v1)
    const version = tts.version || 'v1'
    
    // 파일명 생성 (특수문자 제거)
    const sanitizedProjectName = projectName.replace(/[^a-zA-Z0-9가-힣]/g, '_')
    const fileName = `TTS_${sanitizedProjectName}_${sceneNumber}_${version}.wav`
    
    // TTS 파일 다운로드
    const response = await fetch(tts.file_url)
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    
    // 메모리 정리
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('TTS 다운로드 오류:', error)
    // 실패 시 기본 다운로드
    const link = document.createElement('a')
    link.href = tts.file_url
    link.download = `TTS_${scene.id}_v1.wav`
    link.click()
  }
}

// TTS 재생/일시정지 함수
const playTTS = async (sceneId) => {
  // 온디맨드 검증 실행
  const tts = await validateOnDemand(sceneId)
  if (!tts || !tts.file_url) {
    alert('TTS 파일을 찾을 수 없습니다.')
    return
  }
  
  // 검증 실패한 파일 재생 방지
  if (tts.validation_failed) {
    alert('TTS 파일에 접근할 수 없습니다. 파일을 재생성해주세요.')
    return
  }
  
  if (!audioElements.value[sceneId]) {
    audioElements.value[sceneId] = new Audio(tts.file_url)
  }
  
  const audio = audioElements.value[sceneId]
  
  if (playingTTS.value[sceneId]) {
    // 일시정지
    audio.pause()
    playingTTS.value[sceneId] = false
  } else {
    // 재생
    try {
      // 다른 재생 중인 오디오 정지
      Object.keys(audioElements.value).forEach(id => {
        if (id !== sceneId && audioElements.value[id]) {
          audioElements.value[id].pause()
          playingTTS.value[id] = false
        }
      })
      
      await audio.play()
      playingTTS.value[sceneId] = true
      
      // 재생 완료 시 상태 업데이트
      audio.onended = () => {
        playingTTS.value[sceneId] = false
      }
    } catch (error) {
      console.error('오디오 재생 오류:', error)
      alert('오디오 재생에 실패했습니다.')
    }
  }
}

// 이미지 업로드 관련 메서드
const handleImageUpdate = async () => {
  // 스토어 업데이트
  await productionStore.fetchProductionSheets(props.projectId)
}

const showFullImage = (mediaUrl) => {
  // 전체 화면 미디어 보기 (간단한 모달 또는 새 창)
  window.open(mediaUrl, '_blank')
}

// 전체 미디어 타입 스위치 핸들러
const switchGlobalMediaType = (newType) => {
  globalMediaType.value = newType
  console.log(`전체 미디어 타입이 ${newType}로 변경되었습니다.`)
}

// 모바일에서 개별 씬 미디어 타입 토글
const toggleSceneMediaType = (sceneId) => {
  const currentType = sceneMediaTypes.value[sceneId] || 'image'
  const newType = currentType === 'image' ? 'video' : 'image'
  sceneMediaTypes.value[sceneId] = newType
  console.log(`Scene ${sceneId} media type changed to: ${newType}`)
}

// 태블릿에서 연출가이드 토글
const toggleDirectorGuide = (sceneId) => {
  expandedDirectorGuides.value[sceneId] = !expandedDirectorGuides.value[sceneId]
}

// TTS 파일 검증 함수 (개선된 버전)
const validateTtsFile = async (audioUrl, timeout = 5000) => {
  if (!audioUrl) return false
  
  try {
    // 타임아웃과 함께 AbortController 사용
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)
    
    // HEAD 요청으로 파일 접근 가능성 확인
    const response = await fetch(audioUrl, { 
      method: 'HEAD',
      signal: controller.signal
    })
    
    clearTimeout(timeoutId)
    
    if (!response.ok) {
      console.warn(`TTS 파일 접근 불가: ${audioUrl} (${response.status})`)
      return false
    }
    
    // Content-Type 확인 (오디오 파일인지)
    const contentType = response.headers.get('content-type')
    if (!contentType?.includes('audio')) {
      console.warn(`TTS 파일이 아닌 형식: ${audioUrl} (${contentType})`)
      return false
    }
    
    return true
  } catch (error) {
    if (error.name === 'AbortError') {
      console.warn(`TTS 파일 검증 타임아웃: ${audioUrl}`)
    } else {
      console.warn(`TTS 파일 검증 실패: ${audioUrl}`, error)
    }
    return false
  }
}

// 배치 단위로 TTS 파일 검증 (부하 분산)
const validateTtsFileBatch = async (items, batchSize = 3) => {
  const results = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    
    // 배치 내에서 병렬 처리
    const batchPromises = batch.map(async (item) => {
      const isValid = await validateTtsFile(item.file_url, 3000) // 3초 타임아웃
      return {
        ...item,
        validation_failed: !isValid
      }
    })
    
    const batchResults = await Promise.allSettled(batchPromises)
    
    // 결과 처리 및 에러 핸들링
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value)
      } else {
        // Promise 실패 시 기본값 설정
        results.push({
          ...batch[index],
          validation_failed: true
        })
      }
    })
    
    // 배치 간 대기 (Supabase Storage 부하 분산)
    if (i + batchSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 500)) // 0.5초 대기
    }
  }
  
  return results
}

// TTS 파일 존재 여부 확인 및 검증 (개선된 버전)
const checkExistingTTS = async () => {
  if (!props.scenes.length) return
  
  const sceneIds = props.scenes.map(s => s.id)
  
  try {
    // 각 씬의 최신 TTS 정보 가져오기
    const { data } = await supabase
      .from('tts_audio')
      .select('scene_id, file_url, duration, version')
      .in('scene_id', sceneIds)
      .order('version', { ascending: false })
    
    if (!data || data.length === 0) {
      console.log('TTS 파일이 없습니다.')
      return
    }
    
    // 각 씬의 최신 버전만 저장
    const latestByScene = {}
    data.forEach(item => {
      if (!latestByScene[item.scene_id] || item.version > latestByScene[item.scene_id].version) {
        latestByScene[item.scene_id] = item
      }
    })
    
    const latestItems = Object.values(latestByScene)
    console.log(`${latestItems.length}개의 TTS 파일 검증 시작...`)
    
    // 배치 단위로 TTS 파일 검증
    const validatedItems = await validateTtsFileBatch(latestItems, 3)
    
    // TTS 데이터 저장
    let hasInvalidFiles = false
    validatedItems.forEach(item => {
      ttsData.value[item.scene_id] = {
        file_url: item.file_url,
        duration: item.duration,
        version: item.version,
        validation_failed: item.validation_failed
      }
      
      if (item.validation_failed) {
        hasInvalidFiles = true
      }
    })
    
    // 검증 결과 리포트
    const failedCount = validatedItems.filter(item => item.validation_failed).length
    const successCount = validatedItems.length - failedCount
    
    console.log(`TTS 파일 검증 완료: 성공 ${successCount}개, 실패 ${failedCount}개`)
    
    if (hasInvalidFiles) {
      console.warn(`${failedCount}개의 TTS 파일을 로드할 수 없습니다.`)
    }
    
  } catch (error) {
    console.error('TTS 파일 검증 중 오류:', error)
  }
}

// 선택적 TTS 검증 - 사용자가 실제로 재생할 때만 검증
const validateOnDemand = async (sceneId) => {
  const tts = ttsData.value[sceneId]
  if (!tts || tts.validation_checked) return tts
  
  console.log(`TTS 파일 온디맨드 검증: ${sceneId}`)
  const isValid = await validateTtsFile(tts.file_url, 3000)
  
  // 검증 결과 업데이트
  ttsData.value[sceneId] = {
    ...tts,
    validation_failed: !isValid,
    validation_checked: true
  }
  
  return ttsData.value[sceneId]
}

// 배치 단위로 TTS 데이터 로딩 (큰 데이터셋 대응)
const loadTtsDataInBatches = async (sceneIds, batchSize = 50) => {
  const allData = []
  
  for (let i = 0; i < sceneIds.length; i += batchSize) {
    const batch = sceneIds.slice(i, i + batchSize)
    console.log(`TTS 데이터 배치 ${Math.floor(i/batchSize) + 1}/${Math.ceil(sceneIds.length/batchSize)} 로딩 중... (${batch.length}개)`)
    
    try {
      const { data, error } = await supabase
        .from('tts_audio')
        .select('scene_id, file_url, duration, version')
        .in('scene_id', batch)
        .order('version', { ascending: false })
        .limit(1000) // 배치당 최대 1000개
      
      if (error) {
        console.error(`배치 ${Math.floor(i/batchSize) + 1} 로딩 오류:`, error)
        continue
      }
      
      if (data && data.length > 0) {
        allData.push(...data)
        console.log(`배치 ${Math.floor(i/batchSize) + 1} 완료: ${data.length}개 로드`)
      }
      
      // 배치 간 짧은 대기 (DB 부하 분산)
      if (i + batchSize < sceneIds.length) {
        await new Promise(resolve => setTimeout(resolve, 200))
      }
      
    } catch (error) {
      console.error(`배치 ${Math.floor(i/batchSize) + 1} 처리 중 오류:`, error)
    }
  }
  
  return allData
}

// 개선된 초기 로딩 (대용량 데이터 지원)
const loadTtsDataOnly = async () => {
  if (!props.scenes.length) return
  
  const sceneIds = props.scenes.map(s => s.id)
  console.log(`${sceneIds.length}개 씬의 TTS 데이터 로딩 시작...`)
  
  try {
    // 큰 데이터셋인 경우 배치 로딩
    const allData = sceneIds.length > 100 ? 
      await loadTtsDataInBatches(sceneIds, 50) :
      await loadSingleBatch(sceneIds)
    
    if (allData && allData.length > 0) {
      // 각 씬의 최신 버전만 저장 (개선된 로직)
      const latestByScene = {}
      
      allData.forEach(item => {
        const key = item.scene_id
        if (!latestByScene[key] || item.version > latestByScene[key].version) {
          latestByScene[key] = item
        }
      })
      
      // TTS 데이터 저장
      let loadedCount = 0
      Object.values(latestByScene).forEach(item => {
        ttsData.value[item.scene_id] = {
          file_url: item.file_url,
          duration: item.duration,
          version: item.version,
          validation_failed: false,
          validation_checked: false
        }
        loadedCount++
      })
      
      // 로딩 결과 상세 리포트
      const totalScenes = sceneIds.length
      const loadedScenes = loadedCount
      const missingCount = totalScenes - loadedScenes
      
      console.log(`TTS 데이터 로딩 완료:`)
      console.log(`- 전체 씬: ${totalScenes}개`)
      console.log(`- 로드된 TTS: ${loadedScenes}개`)
      console.log(`- 누락된 TTS: ${missingCount}개`)
      
      if (missingCount > 0) {
        console.warn(`${missingCount}개 씬에 TTS 데이터가 없습니다.`)
        logMissingScenes(sceneIds, latestByScene)
      }
      
    } else {
      console.log('로드된 TTS 데이터가 없습니다.')
    }
  } catch (error) {
    console.error('TTS 데이터 로딩 중 전체 오류:', error)
  }
}

// 단일 배치 로딩 (소규모 데이터용)
const loadSingleBatch = async (sceneIds) => {
  const { data, error } = await supabase
    .from('tts_audio')
    .select('scene_id, file_url, duration, version')
    .in('scene_id', sceneIds)
    .order('version', { ascending: false })
    .limit(2000) // 안전 제한
  
  if (error) throw error
  return data || []
}

// 누락된 씬 로깅
const logMissingScenes = (allSceneIds, loadedData) => {
  const loadedSceneIds = new Set(Object.keys(loadedData))
  const missingSceneIds = allSceneIds.filter(id => !loadedSceneIds.has(id))
  
  console.log('TTS가 없는 씬들:', missingSceneIds.slice(0, 10)) // 처음 10개만 표시
  if (missingSceneIds.length > 10) {
    console.log(`... 외 ${missingSceneIds.length - 10}개 더`)
  }
}

// 누락된 TTS 재시도 로딩
const retryMissingTts = async () => {
  const sceneIds = props.scenes.map(s => s.id)
  const loadedSceneIds = new Set(Object.keys(ttsData.value))
  const missingSceneIds = sceneIds.filter(id => !loadedSceneIds.has(id))
  
  if (missingSceneIds.length === 0) {
    console.log('모든 TTS 데이터가 로드되어 있습니다.')
    return
  }
  
  console.log(`${missingSceneIds.length}개의 누락된 TTS 재시도 로딩...`)
  
  try {
    const retryData = await loadSingleBatch(missingSceneIds)
    
    if (retryData && retryData.length > 0) {
      // 최신 버전 선택 및 저장
      const latestByScene = {}
      retryData.forEach(item => {
        const key = item.scene_id
        if (!latestByScene[key] || item.version > latestByScene[key].version) {
          latestByScene[key] = item
        }
      })
      
      // TTS 데이터 추가
      let recoveredCount = 0
      Object.values(latestByScene).forEach(item => {
        ttsData.value[item.scene_id] = {
          file_url: item.file_url,
          duration: item.duration,
          version: item.version,
          validation_failed: false,
          validation_checked: false
        }
        recoveredCount++
      })
      
      console.log(`재시도 완료: ${recoveredCount}개의 TTS 복구됨`)
    }
  } catch (error) {
    console.error('TTS 재시도 로딩 오류:', error)
  }
}

// TTS 로딩 상태 실시간 모니터링
const monitorTtsLoading = () => {
  const totalScenes = props.scenes.length
  const loadedCount = Object.keys(ttsData.value).length
  const percentage = totalScenes > 0 ? Math.round((loadedCount / totalScenes) * 100) : 0
  
  console.log(`TTS 로딩 진행률: ${loadedCount}/${totalScenes} (${percentage}%)`)
  
  // 로딩이 불완전한 경우 알림
  if (totalScenes > 0 && percentage < 90) {
    console.warn(`⚠️  TTS 로딩 불완전: ${100 - percentage}% 누락`)
    
    // 5초 후 자동 재시도
    setTimeout(() => {
      console.log('자동 재시도 실행...')
      retryMissingTts()
    }, 5000)
  }
}

// 자동 새로고침 함수
const startPolling = () => {
  // 기존 polling 정리
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
  }
  
  // 10초마다 실시간 데이터 확인 (silent 모드로)
  pollingInterval.value = setInterval(async () => {
    // 현재 편집 중이 아닐 때만 새로고침
    if (!editingCell.value && !isSaving.value) {
      await productionStore.fetchProductionSheets(props.projectId, true) // silent: true
      console.log('자동 새로고침: 프로덕션 데이터 업데이트됨')
    }
  }, 10000) // 10초마다
}

const stopPolling = () => {
  if (pollingInterval.value) {
    clearInterval(pollingInterval.value)
    pollingInterval.value = null
  }
}

// scenes 변경 감지
watch(() => props.scenes, () => {
  initSceneMediaTypes()
}, { deep: true })

// 컴포넌트 마운트 시 TTS 확인 및 폴링 시작 (대용량 데이터 지원)
onMounted(async () => {
  initSceneMediaTypes() // 씬 미디어 타입 초기화
  
  // 개선된 TTS 데이터 로딩
  await loadTtsDataOnly()
  
  // 로딩 완료 후 모니터링
  setTimeout(() => {
    monitorTtsLoading() // 로딩 상태 확인 및 자동 재시도
  }, 2000)
  
  // 백그라운드에서 점진적 검증 (대용량인 경우 비활성화)
  if (props.scenes.length <= 50) {
    setTimeout(() => {
      checkExistingTTS() // 소규모인 경우만 검증
    }, 5000)
  }
  
  startPolling() // 자동 새로고침 시작
  document.addEventListener('click', handleClickOutside) // 드롭다운 외부 클릭 감지
})


// 컴포넌트 언마운트 시 오디오 정리 및 폴링 중지
onUnmounted(() => {
  Object.values(audioElements.value).forEach(audio => {
    if (audio) {
      audio.pause()
      audio.src = ''
    }
  })
  stopPolling() // 자동 새로고침 중지
  window.removeEventListener('resize', handleResize) // 리사이즈 리스너 제거
  document.removeEventListener('click', handleClickOutside) // 드롭다운 이벤트 리스너 제거
})


// 드래그 앤 드롭 메서드들
const handleDragStart = (scene, event) => {
  draggedItem.value = scene.id
  isDragging.value = true
  event.dataTransfer.effectAllowed = 'move'
  event.dataTransfer.setData('text/plain', scene.id)
  
  // 드래그 이미지 설정
  const dragImage = event.target.cloneNode(true)
  dragImage.style.opacity = '0.8'
  dragImage.style.transform = 'rotate(3deg)'
  document.body.appendChild(dragImage)
  event.dataTransfer.setDragImage(dragImage, 0, 0)
  setTimeout(() => document.body.removeChild(dragImage), 0)
}

const handleDragOver = (scene, event) => {
  if (draggedItem.value && draggedItem.value !== scene.id) {
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
  }
}

const handleDragEnter = (scene) => {
  if (draggedItem.value && draggedItem.value !== scene.id) {
    dropTarget.value = scene.id
  }
}

const handleDragLeave = () => {
  // 짧은 딜레이 후 dropTarget 클리어 (자식 요소로 이동할 때 깜빡임 방지)
  setTimeout(() => {
    if (!document.querySelector(':hover')?.closest('.production-sheet-data-row')) {
      dropTarget.value = null
    }
  }, 50)
}

const handleDrop = async (targetScene, event) => {
  event.preventDefault()
  
  if (!draggedItem.value || draggedItem.value === targetScene.id) {
    return
  }
  
  try {
    const draggedSceneId = draggedItem.value
    const draggedScene = props.scenes.find(s => s.id === draggedSceneId)
    const targetSceneIndex = props.scenes.findIndex(s => s.id === targetScene.id)
    
    if (!draggedScene || targetSceneIndex === -1) {
      return
    }
    
    // 새로운 씬 순서 계산
    const newScenes = [...props.scenes]
    const draggedIndex = newScenes.findIndex(s => s.id === draggedSceneId)
    
    // 배열에서 드래그된 씬 제거
    const [movedScene] = newScenes.splice(draggedIndex, 1)
    
    // 타겟 위치에 삽입
    newScenes.splice(targetSceneIndex, 0, movedScene)
    
    // 씬 번호 재정렬
    await reorderScenes(newScenes)
    
  } catch (error) {
    console.error('씬 재정렬 실패:', error)
    alert('씬 재정렬에 실패했습니다.')
  }
}

const handleDragEnd = () => {
  draggedItem.value = null
  dropTarget.value = null
  isDragging.value = false
}

// 씬 재정렬 함수 (중복 번호 문제 해결)
const reorderScenes = async (newScenes) => {
  try {
    // 1단계: 모든 씬을 임시 번호로 업데이트 (중복 방지)
    console.log('씬 재정렬 시작: 1단계 - 임시 번호 할당')
    for (let i = 0; i < newScenes.length; i++) {
      const tempNumber = 9000 + i // 임시 번호 (9000번대 사용)
      const { error } = await supabase
        .from('production_sheets')
        .update({ scene_number: tempNumber })
        .eq('id', newScenes[i].id)
      
      if (error) {
        console.error(`임시 번호 할당 실패 (${newScenes[i].id}):`, error)
        throw error
      }
    }
    
    // 짧은 대기 시간
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 2단계: 정상 번호로 업데이트
    console.log('씬 재정렬: 2단계 - 정상 번호 할당')
    for (let i = 0; i < newScenes.length; i++) {
      const finalNumber = i + 1
      const { error } = await supabase
        .from('production_sheets')
        .update({ scene_number: finalNumber })
        .eq('id', newScenes[i].id)
      
      if (error) {
        console.error(`정상 번호 할당 실패 (${newScenes[i].id}):`, error)
        throw error
      }
    }
    
    // 스토어 새로고침
    await productionStore.fetchProductionSheets(props.projectId)
    
    // 성공 메시지
    const toast = document.createElement('div')
    toast.textContent = '씬 순서가 변경되었습니다'
    toast.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #10b981; color: white; padding: 8px 16px; border-radius: 6px; z-index: 9999; font-size: 14px;'
    document.body.appendChild(toast)
    setTimeout(() => document.body.removeChild(toast), 2000)
    
  } catch (error) {
    console.error('씬 재정렬 업데이트 실패:', error)
    throw error
  }
}


// 씬 병합 함수
const mergeSelectedScenes = async () => {
  if (props.selectedScenes.length < 2) {
    alert('병합하려면 2개 이상의 씬을 선택해주세요.')
    return
  }
  
  // 선택된 씬들을 번호 순으로 정렬
  const selectedScenesData = props.scenes
    .filter(scene => props.selectedScenes.includes(scene.id))
    .sort((a, b) => a.scene_number - b.scene_number)
  
  if (!confirm(`선택된 ${selectedScenesData.length}개 씬을 하나로 병합하시겠습니까?`)) {
    return
  }
  
  try {
    const firstScene = selectedScenesData[0]
    const mergedText = selectedScenesData
      .map(scene => scene.original_script_text)
      .join('\n\n')
    
    // 첫 번째 씬을 병합된 텍스트로 업데이트
    const { error: updateError } = await supabase
      .from('production_sheets')
      .update({ original_script_text: mergedText })
      .eq('id', firstScene.id)
    
    if (updateError) throw updateError
    
    // 나머지 씬들 삭제
    const scenesToDelete = selectedScenesData.slice(1).map(s => s.id)
    const { error: deleteError } = await supabase
      .from('production_sheets')
      .delete()
      .in('id', scenesToDelete)
    
    if (deleteError) throw deleteError
    
    // 씬 번호 재정렬
    await reorderAllScenes()
    
    // 데이터 새로고침
    await productionStore.fetchProductionSheets(props.projectId)
    
    alert(`${selectedScenesData.length}개 씬이 성공적으로 병합되었습니다.`)
    
    // 선택 해제
    emit('update:selected', [])
    
  } catch (error) {
    console.error('씬 병합 실패:', error)
    alert('씬 병합에 실패했습니다.')
  }
}

// 모든 씬 번호 재정렬
const reorderAllScenes = async () => {
  const { data: scenes, error } = await supabase
    .from('production_sheets')
    .select('id')
    .eq('project_id', props.projectId)
    .order('scene_number', { ascending: true })
  
  if (error) throw error
  
  for (let i = 0; i < scenes.length; i++) {
    const { error: updateError } = await supabase
      .from('production_sheets')
      .update({ scene_number: i + 1 })
      .eq('id', scenes[i].id)
    
    if (updateError) throw updateError
  }
}

// 씬 그룹화 관련 computed
const canApplyGrouping = computed(() => {
  if (groupingType.value === 'new') {
    return newGroupName.value.trim().length > 0
  }
  return selectedSequenceId.value > 0
})

// 씬 그룹화 메서드들
const getSceneNumber = (sceneId) => {
  const scene = props.scenes.find(s => s.id === sceneId)
  return scene ? scene.scene_number : '?'
}

const getSceneText = (sceneId) => {
  const scene = props.scenes.find(s => s.id === sceneId)
  if (!scene) return ''
  const text = scene.original_script_text || ''
  return text.length > 50 ? text.substring(0, 50) + '...' : text
}

const closeGroupingModal = () => {
  showGroupingModal.value = false
  newGroupName.value = ''
  sceneTags.value = ''
  groupingType.value = 'new'
}

const addNewSequence = () => {
  const newSequenceName = prompt('새 시퀀스 이름을 입력하세요:')
  if (newSequenceName && newSequenceName.trim()) {
    sequenceNames.value.push(newSequenceName.trim())
    selectedSequenceId.value = sequenceNames.value.length
  }
}

const applyGrouping = async () => {
  if (!canApplyGrouping.value) return
  
  try {
    const updates = []
    const tagsArray = sceneTags.value.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
    
    if (groupingType.value === 'new') {
      // 새 그룹 생성
      for (const sceneId of props.selectedScenes) {
        updates.push({
          id: sceneId,
          scene_group: newGroupName.value.trim(),
          scene_tags: tagsArray,
          metadata: { grouping_date: new Date().toISOString() }
        })
      }
    } else {
      // 시퀀스로 그룹화
      const sequenceName = sequenceNames.value[selectedSequenceId.value - 1]
      for (const sceneId of props.selectedScenes) {
        updates.push({
          id: sceneId,
          sequence_id: selectedSequenceId.value,
          sequence_name: sequenceName,
          scene_tags: tagsArray,
          metadata: { 
            sequence_grouping_date: new Date().toISOString(),
            original_sequence: 1 // 기존 시퀀스 기록
          }
        })
      }
    }
    
    // 데이터베이스 업데이트
    for (const update of updates) {
      const { id, ...updateData } = update
      const { error } = await supabase
        .from('production_sheets')
        .update(updateData)
        .eq('id', id)
      
      if (error) {
        throw error
      }
    }
    
    // 데이터 새로고침
    await productionStore.fetchProductionSheets(props.projectId)
    
    alert(`${props.selectedScenes.length}개 씬이 성공적으로 그룹화되었습니다.`)
    
    // 선택 해제 및 모달 닫기
    emit('update:selected', [])
    closeGroupingModal()
    
  } catch (error) {
    console.error('씬 그룹화 실패:', error)
    alert('씬 그룹화에 실패했습니다.')
  }
}

// ESC 키 처리 (변경사항 확인)
const handleEscapeKey = () => {
  if (hasUnsavedChanges.value) {
    const confirmCancel = confirm('저장되지 않은 변경사항이 있습니다. 정말 취소하시겠습니까?')
    if (confirmCancel) {
      cancelEdit()
    }
  } else {
    cancelEdit()
  }
}

// export deleteSelectedScenes for parent component
defineExpose({ deleteSelectedScenes, mergeSelectedScenes })
</script>

<style scoped>
/* 루트 컨테이너 */
.production-table-root {
  width: 100%;
  height: 100%;
  position: relative;
  display: flex;
}

.production-table-wrapper {
  width: 100%;
  position: relative;
  height: 100%;
  overflow-y: auto;
  padding: 10px 5px; /* 좌우 여백 최소화 */
  padding-top: 10px;
  transition: padding-right 0.3s ease;
}

/* 패널이 열렸을 때 콘텐츠 영역 조정 */
.production-table-wrapper.panel-open {
  padding-right: 310px; /* 패널 너비(300px) + 여백(10px) */
}

/* 섹션 헤더 - 이미지뷰와 스타일 통일 */
.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 0;
}

.section-header h4 {
  font-size: 1.1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.filter-options {
  display: flex;
  gap: 12px;
}

/* 선택 액션 바 */
.selection-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.1), rgba(34, 197, 94, 0.05));
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 8px;
  margin-bottom: 12px;
  animation: slideDown 0.2s ease-out;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.selection-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selection-count {
  font-weight: 600;
  color: var(--primary-color);
  font-size: 0.95rem;
}

.selection-buttons {
  display: flex;
  gap: 8px;
}

.btn-character,
.btn-reference-keywords,
.btn-tts,
.btn-play-tts,
.btn-download-tts {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-play-tts {
  background-color: #3b82f6;
}

.btn-download-tts {
  background-color: #10b981;
}

.btn-download-images {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: #8b5cf6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-download-videos {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-character:hover,
.btn-reference-keywords:hover,
.btn-tts:hover,
.btn-play-tts:hover,
.btn-download-tts:hover {
  background-color: var(--primary-dark);
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.3);
}

.btn-play-tts:hover {
  background-color: #2563eb;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-download-tts:hover {
  background-color: #059669;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);
}

.btn-download-images:hover {
  background-color: #7c3aed;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.btn-download-videos:hover {
  background-color: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.btn-merge {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: #f59e0b;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-merge:hover:not(:disabled) {
  background-color: #d97706;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.3);
}

.btn-merge:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

.btn-group {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: #8b5cf6;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-group:hover:not(:disabled) {
  background-color: #7c3aed;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(139, 92, 246, 0.3);
}

.btn-group:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 그룹화 모달 스타일 */
.modal-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: var(--bg-primary);
  border-radius: 12px;
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.grouping-modal {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text-primary);
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-secondary);
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.modal-close:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
}

.modal-body {
  padding: 24px;
}

.selected-scenes-preview {
  margin-bottom: 24px;
  padding: 16px;
  background-color: var(--bg-secondary);
  border-radius: 8px;
}

.selected-scenes-preview h4 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.scene-list {
  max-height: 150px;
  overflow-y: auto;
}

.scene-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--border-color);
}

.scene-item:last-child {
  border-bottom: none;
}

.scene-number {
  font-weight: 600;
  color: var(--primary-color);
  min-width: 40px;
}

.scene-text {
  flex: 1;
  color: var(--text-secondary);
  font-size: 0.9rem;
}

.grouping-options {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.option-group h4,
.input-group label {
  margin: 0 0 8px 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  font-weight: 400;
  cursor: pointer;
}

.radio-group input[type="radio"] {
  margin: 0;
}

.form-input,
.form-select {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid var(--border-color);
  border-radius: 6px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-size: 0.95rem;
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--primary-color);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
}

.btn-add-sequence {
  margin-top: 8px;
  padding: 8px 16px;
  background-color: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-add-sequence:hover {
  background-color: var(--primary-dark);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 20px 24px;
  border-top: 1px solid var(--border-color);
}

.btn-cancel,
.btn-apply {
  padding: 10px 20px;
  border: none;
  border-radius: 6px;
  font-size: 0.95rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
}

.btn-cancel:hover {
  background-color: var(--bg-primary);
}

.btn-apply {
  background-color: var(--primary-color);
  color: white;
}

.btn-apply:hover:not(:disabled) {
  background-color: var(--primary-dark);
}

.btn-apply:disabled {
  background-color: #9ca3af;
  cursor: not-allowed;
  opacity: 0.6;
}

/* 그룹/시퀀스 컴럼 스타일 */
.scene-group-col {
  min-width: 120px;
  padding: 8px;
}

.group-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sequence-tag {
  background-color: #dbeafe;
  color: #1e40af;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
}

.group-tag {
  background-color: #fef3c7;
  color: #92400e;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 2px;
}

.tag {
  background-color: #f3f4f6;
  color: #374151;
  padding: 1px 6px;
  border-radius: 8px;
  font-size: 0.7rem;
  border: 1px solid #d1d5db;
}

/* 인라인 편집 안전장치 스타일 */
.edit-textarea.has-changes {
  border-color: #f59e0b;
  box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2);
}

.edit-status {
  margin-top: 4px;
  font-size: 0.75rem;
}

.unsaved-indicator {
  color: #f59e0b;
  font-weight: 500;
}

.edit-hint {
  font-size: 0.7rem;
  color: var(--text-secondary);
  margin-top: 4px;
  font-style: italic;
}

.btn-tts svg,
.btn-download-tts svg,
.btn-download-images svg,
.btn-download-videos svg {
  width: 16px;
  height: 16px;
}

.btn-delete {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  background-color: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-delete:hover {
  background-color: #dc2626;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);
}

.btn-delete svg {
  width: 16px;
  height: 16px;
}

.btn-cancel {
  padding: 6px 14px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background-color: var(--bg-tertiary);
  border-color: var(--text-secondary);
}

.production-table-container {
  width: 100%;
  max-height: calc(100vh - 150px);
  overflow-y: auto;
  overflow-x: auto;
  border: 1px solid var(--border-color);
  border-radius: 8px;
}

.production-table-container::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

.production-table-container::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-radius: 4px;
}

.production-table-container::-webkit-scrollbar-thumb {
  background: var(--border-color);
  border-radius: 4px;
}

.production-table-container::-webkit-scrollbar-thumb:hover {
  background: var(--text-secondary);
}

.production-table {
  width: 100%;
  border-collapse: collapse;
  background-color: var(--bg-primary);
  table-layout: fixed;
}

.production-table thead {
  background-color: var(--bg-secondary);
  position: sticky;
  top: 0;
  z-index: 10;
}

.production-table th {
  padding: 12px;
  text-align: center;
  font-weight: 600;
  color: var(--text-primary);
  border-bottom: 2px solid var(--border-color);
  white-space: nowrap;
}

.production-table tbody tr {
  border-bottom: 1px solid var(--border-color);
  transition: background-color 0.2s;
  min-height: 140px;
}

.production-table tbody tr:hover {
  background-color: var(--bg-secondary);
}

.production-table tbody tr.selected {
  background-color: rgba(74, 222, 128, 0.1);
}

/* 드래그 앤 드롭 스타일 */
.production-table tbody tr.being-dragged {
  opacity: 0.5;
  transform: rotate(2deg);
  cursor: grabbing;
}

.production-table tbody tr.drop-target {
  border-top: 3px solid var(--primary-color);
  background-color: rgba(79, 70, 229, 0.1);
}

.production-table tbody tr[draggable="true"] {
  cursor: grab;
}

.production-table tbody tr[draggable="true"]:hover {
  border-left: 3px solid var(--primary-color);
  background-color: rgba(79, 70, 229, 0.05);
}

.production-table td {
  padding: 12px;
  vertical-align: middle;
  color: var(--text-primary);
}

/* Media type switcher */
.media-header {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 4px 0;
}

/* Switch container */
.media-switch-container {
  display: flex;
  align-items: center;
  gap: 10px;
}

.media-label {
  font-size: 0.85rem;
  color: var(--text-secondary);
  transition: color 0.3s;
  font-weight: 500;
}

.media-label.active {
  font-weight: 600;
}

/* 이미지 모드일 때 이미지 라벨 활성화 색상 */
.media-label.active:first-child {
  color: #60a5fa; /* 파란색 */
}

/* 비디오 모드일 때 비디오 라벨 활성화 색상 */
.media-label.active:last-child {
  color: #10b981; /* 초록색 */
}

/* 이미지 레이블 활성화 시 파란색 */
.media-label:first-child.active {
  color: #60a5fa;
}

/* 비디오 레이블 활성화 시 초록색 */
.media-label:last-child.active {
  color: var(--primary-color);
}

/* 캐릭터 정규화 버튼 스타일 */
.btn-normalize {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.3s ease;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.btn-normalize:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

/* Toggle switch styles */
.media-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.media-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.switch-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #60a5fa; /* 이미지 모드: 파란색 */
  transition: all 0.3s;
  border-radius: 24px;
}

.switch-slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: all 0.3s;
  border-radius: 50%;
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.media-switch input:checked + .switch-slider {
  background-color: #10b981; /* 비디오 모드: 선명한 초록색 */
}

.media-switch input:checked + .switch-slider:before {
  transform: translateX(20px);
}

.media-switch:hover .switch-slider {
  opacity: 0.9;
}

.media-switch input:not(:checked):hover + .switch-slider {
  background-color: #3b82f6; /* 이미지 모드 호버: 진한 파란색 */
}

.media-switch input:checked:hover + .switch-slider {
  background-color: #059669; /* 비디오 모드 호버: 진한 초록색 */
}

/* Old media type switcher styles - kept for fallback */
/* .media-type-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 2px 8px;
  background: var(--bg-tertiary);
  border-radius: 6px;
}

.media-type-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  padding: 2px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.media-type-btn:hover {
  color: var(--text-primary);
  background: var(--bg-secondary);
}

.media-type-btn.active {
  color: white;
  background: var(--primary-color);
}

.separator {
  color: var(--text-tertiary);
  font-size: 0.9rem;
} */

/* Column widths */
.scene-number-col {
  width: 75px; /* 약간 감소 */
  min-width: 75px;
  text-align: center;
  vertical-align: middle;
}

.scene-number-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.scene-number {
  font-weight: 600;
  color: var(--text-primary);
  font-size: 14px;
}

.scene-image-col {
  width: 150px; /* 감소 */
  min-width: 150px;
  text-align: center;
  padding: 8px;
  vertical-align: middle;
}

.script-col {
  /* width는 colgroup에서 관리 (45%) */
  padding: 12px;
  vertical-align: top; /* 상단 정렬 */
}

/* 데스크톱/태블릿에서 script-col 스타일 초기화 */
@media (min-width: 769px) {
  .production-table td.script-col {
    background: transparent !important;
    border-radius: 0 !important;
    margin: 0 !important;
  }
}

/* scene-type-col 제거됨 - 씬 번호 칸으로 통합 */

.scene-group-col {
  min-width: 120px;
  max-width: 160px;
  text-align: center;
}

.group-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
}

.group-badge {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  min-width: 60px;
}

.sequence-badge {
  background: linear-gradient(135deg, #8b5cf6, #7c3aed);
  color: white;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  text-align: center;
  min-width: 60px;
}

.sequence-badge.default-sequence {
  background: linear-gradient(135deg, #6b7280, #4b5563);
  opacity: 0.7;
}

.sequence-badge.mobile {
  font-size: 0.7rem;
  padding: 1px 6px;
  margin: 0 4px;
}

/* 시퀀스 그룹 컬럼 스타일 */
.sequence-group-col {
  width: 80px;
  min-width: 80px;
  max-width: 80px;
  padding: 0;
  text-align: center;
  vertical-align: middle;
  background: var(--bg-secondary);
  border-right: 2px solid var(--border-color);
  position: relative;
}

.sequence-group-cell {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 4px;
  background: var(--bg-secondary);
}

.sequence-group-cell-empty {
  height: 100%;
  background: var(--bg-secondary);
}

/* 시퀀스 그룹 시각적 병합 - 실제 적용 */
@media (min-width: 769px) {
  .production-table tbody tr td.sequence-group-col.sequence-first {
    border-bottom: 1px solid var(--bg-secondary) !important;
    position: relative;
  }

  .production-table tbody tr td.sequence-group-col.sequence-middle {
    border-top: 1px solid var(--bg-secondary) !important;
    border-bottom: 1px solid var(--bg-secondary) !important;
    position: relative;
  }

  .production-table tbody tr td.sequence-group-col.sequence-last {
    border-top: 1px solid var(--bg-secondary) !important;
    position: relative;
  }
  
  /* 경계선을 덮어서 숨김 */
  /* 시퀀스 그룹 셀의 배경색을 통일하고 경계를 숨겨서 시각적으로 병합된 것처럼 보이게 함 */
  .production-table tbody tr td.sequence-group-col.sequence-first,
  .production-table tbody tr td.sequence-group-col.sequence-middle,
  .production-table tbody tr td.sequence-group-col.sequence-last {
    background-color: var(--bg-secondary) !important;
    position: relative;
  }

  /* 인접한 시퀀스 셀 사이의 경계선을 제거하여 연결된 모양 만들기 */
  .production-table tbody tr td.sequence-group-col.sequence-first::after {
    content: '';
    position: absolute;
    bottom: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--bg-secondary);
    z-index: 2;
  }
  
  .production-table tbody tr td.sequence-group-col.sequence-middle::before,
  .production-table tbody tr td.sequence-group-col.sequence-middle::after {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--bg-secondary);
    z-index: 2;
  }
  
  .production-table tbody tr td.sequence-group-col.sequence-middle::before {
    top: -1px;
  }
  
  .production-table tbody tr td.sequence-group-col.sequence-middle::after {
    bottom: -1px;
  }
  
  .production-table tbody tr td.sequence-group-col.sequence-last::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 0;
    right: 0;
    height: 1px;
    background: var(--bg-secondary);
    z-index: 2;
  }
}

.sequence-name-vertical {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1.1;
  letter-spacing: 0.5px;
}

.sequence-name-horizontal {
  writing-mode: horizontal-tb;
  text-align: center;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
  letter-spacing: 1px;
  white-space: nowrap;
  /* transform: rotate(180deg) 제거 - 텍스트가 뒤집히는 원인 */
}

.director-guide-col {
  min-width: 200px;
  max-width: 300px;
}

.assets-col {
  min-width: 160px; /* 최소 너비 확보 */
  width: 180px;
}

.tts-col {
  width: 130px; /* 약간 감소 */
  min-width: 130px;
  text-align: center;
}

/* 아이콘 스타일 */
.icon-wrapper {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.icon-wrapper svg {
  width: 20px;
  height: 20px;
}

.icon-data {
  color: #3b82f6;
}

.icon-infographic {
  color: #4ade80;
}

.icon-text {
  font-size: 0.75rem;
  font-weight: 500;
  display: none;
}

@media (min-width: 1024px) {
  .icon-text {
    display: inline;
  }
}

/* 인라인 편집 스타일 */
.editable-cell {
  cursor: text;
  position: relative;
}

.editable-cell:hover {
  background-color: rgba(74, 222, 128, 0.05);
}

.edit-input,
.edit-textarea {
  width: 100%;
  padding: 8px;
  border: 2px solid var(--primary-color);
  border-radius: 4px;
  background-color: var(--bg-primary);
  color: var(--text-primary);
  font-family: inherit;
  font-size: inherit;
  outline: none;
}

.edit-textarea {
  resize: vertical;
  min-height: 60px;
  line-height: 1.5;
}

.edit-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
}

.empty-hint {
  color: var(--text-secondary);
  font-style: italic;
  font-size: 0.85rem;
  cursor: pointer;
}

.clickable-hint {
  color: var(--primary);
  border: 1px dashed var(--primary);
  padding: 4px 8px;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-style: normal;
}

.clickable-hint:hover {
  background-color: var(--primary);
  color: white;
}

/* Tags */
.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 3px;
}

.tag {
  display: inline-block;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.character-tag {
  background-color: rgba(168, 85, 247, 0.15);
  color: #a855f7;
  font-size: 0.75rem;
  padding: 1px 6px;
}

.reference-keyword-tag {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
  font-size: 0.75rem;
}

.reference-source-tag {
  background-color: rgba(16, 185, 129, 0.15);
  color: #10b981;
  font-size: 0.75rem;
  padding: 1px 6px;
}

/* TTS 총 듀레이션 표시 */
.tts-total-duration {
  font-weight: normal;
  color: var(--text-secondary);
  font-size: 0.85rem;
  margin-left: 4px;
}

/* TTS 컨트롤 스타일 */
.tts-controls {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: center;
  justify-content: center;
}

.tts-generate-btn {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
}

.tts-generate-btn:hover:not(:disabled) {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.tts-generate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tts-play-btn {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.tts-play-btn:hover {
  background-color: var(--primary-color);
  border-color: var(--primary-color);
  color: white;
}

.tts-play-btn.playing {
  background-color: #10b981;
  border-color: #10b981;
  color: white;
}

.tts-play-btn.validation-failed {
  background-color: #fee2e2;
  border-color: #fca5a5;
  color: #dc2626;
  cursor: not-allowed;
  opacity: 0.7;
}

.tts-validation-warning {
  font-size: 11px;
  color: #dc2626;
  background-color: #fef2f2;
  border: 1px solid #fca5a5;
  border-radius: 4px;
  padding: 2px 6px;
  margin-bottom: 4px;
  text-align: center;
}

.tts-duration {
  font-size: 12px;
  color: var(--text-secondary);
  font-family: monospace;
  padding: 2px 0;
}

.tts-regenerate-btn {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 12px;
  font-weight: 500;
}

.tts-regenerate-btn:hover:not(:disabled) {
  background-color: #fbbf24;
  border-color: #fbbf24;
  opacity: 1;
}

.tts-regenerate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.tts-regenerate-btn.validation-failed-regenerate {
  background-color: #fef3c7;
  border-color: #fbbf24;
  color: #d97706;
  font-weight: 600;
}

.tts-regenerate-btn.validation-failed-regenerate:hover:not(:disabled) {
  background-color: #fbbf24;
  border-color: #f59e0b;
  color: white;
}

.tts-download-btn {
  width: 60px;
  padding: 5px 8px;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  background-color: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
  font-weight: 500;
}

.tts-download-btn:hover {
  background-color: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.loading-spinner-small {
  width: 12px;
  height: 12px;
  border: 2px solid var(--border-color);
  border-top: 2px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* 씬 이미지 스타일은 SceneImageUploader 컴포넌트로 이동 */

/* 씬 구분선 행 - 높이 최소화 */
.scene-divider-row {
  height: 5px;
  position: relative;
}

.scene-divider-cell {
  padding: 0 !important;
  height: 5px;
  position: relative;
  border: none !important;
}

/* 씬 추가 버튼 오버레이 */
.add-scene-overlay {
  position: absolute;
  top: -10px;
  left: 0;
  right: 0;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
  z-index: 5;
}

.add-scene-overlay.visible {
  opacity: 1;
  pointer-events: all;
}

.add-scene-overlay-button {
  padding: 6px 20px;
  background: var(--bg-primary);
  border: 1px solid var(--primary-color);
  border-radius: 20px;
  color: var(--primary-color);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.add-scene-overlay-button:hover {
  background: var(--primary-color);
  color: var(--bg-primary);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

/* No data message */
.no-data {
  text-align: center;
  padding: 60px 20px;
  color: var(--text-secondary);
}

/* Checkbox styling */
input[type="checkbox"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: var(--primary-color);
}

/* TTS 플레이어 스타일 */
.tts-player {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(37, 99, 235, 0.05));
  border: 1px solid rgba(59, 130, 246, 0.3);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.1);
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.track-info h4 {
  margin: 0 0 4px 0;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-primary);
}

.track-info p {
  margin: 0;
  font-size: 0.9rem;
  color: var(--text-secondary);
  line-height: 1.4;
}

.playlist-info {
  background: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
}

.close-player-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-player-btn:hover {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
}

.player-controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  margin-bottom: 12px;
}

.control-btn {
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid rgba(59, 130, 246, 0.3);
  color: #3b82f6;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.control-btn:hover:not(:disabled) {
  background: rgba(59, 130, 246, 0.2);
  transform: translateY(-1px);
}

.control-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.play-pause-btn {
  background: #3b82f6;
  border: none;
  color: white;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.3);
}

.play-pause-btn:hover {
  background: #2563eb;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
}

.player-progress {
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-current,
.time-duration {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: monospace;
  min-width: 35px;
}

.progress-bar {
  flex: 1;
  height: 4px;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 2px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 2px;
  transition: width 0.1s ease;
}

/* 플레이리스트 타임라인 스타일 */
.playlist-timeline {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(59, 130, 246, 0.2);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.timeline-header h5 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--text-primary);
}

.timeline-time {
  font-size: 0.85rem;
  color: var(--text-secondary);
  font-family: monospace;
}

.timeline-container {
  position: relative;
}

.timeline-progress-bar {
  height: 8px;
  background: rgba(59, 130, 246, 0.2);
  border-radius: 4px;
  cursor: pointer;
  margin-bottom: 8px;
  overflow: hidden;
}

.timeline-progress-fill {
  height: 100%;
  background: #3b82f6;
  border-radius: 4px;
  transition: width 0.1s ease;
}

.timeline-tracks {
  display: flex;
  gap: 1px;
  height: 24px;
}

.timeline-track {
  background: rgba(59, 130, 246, 0.3);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-width: 20px;
  border: 1px solid transparent;
}

.timeline-track:hover {
  background: rgba(59, 130, 246, 0.5);
  transform: translateY(-1px);
}

.timeline-track.active {
  background: #3b82f6;
  border-color: #1d4ed8;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.3);
}

.track-number {
  font-size: 0.7rem;
  font-weight: 600;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  white-space: nowrap;
  overflow: hidden;
}

/* Mobile responsive */
@media (max-width: 768px) {
  .production-table-wrapper {
    padding: 5px 2px;
  }
  
  /* 모바일 컨트롤 헤더 (컴팩트) */
  .mobile-control-header {
    padding: 8px 12px;
    background: var(--bg-secondary);
    border-radius: 6px;
    margin: 8px 0;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  }
  
  .mobile-controls-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
  }
  
  .media-switch-compact {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  
  .media-label-compact {
    font-size: 0.8rem;
    color: var(--text-secondary);
    transition: color 0.2s;
  }
  
  .media-label-compact.active {
    color: var(--primary-color);
    font-weight: 600;
  }
  
  .mobile-action-buttons {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  
  /* TTS 플레이어 모바일 스타일 */
  .tts-player {
    padding: 12px;
  }
  
  .player-header {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .track-info h4 {
    font-size: 0.9rem;
  }
  
  .track-info p {
    font-size: 0.8rem;
  }
  
  .playlist-info {
    align-self: flex-start;
  }
  
  .player-controls {
    gap: 8px;
  }
  
  .control-btn {
    width: 36px;
    height: 36px;
  }
  
  .play-pause-btn {
    width: 44px;
    height: 44px;
  }
  
  /* 타임라인 모바일 스타일 */
  .playlist-timeline {
    margin-top: 12px;
    padding-top: 12px;
  }
  
  .timeline-header {
    flex-direction: column;
    gap: 4px;
    align-items: flex-start;
  }
  
  .timeline-header h5 {
    font-size: 0.8rem;
  }
  
  .timeline-time {
    font-size: 0.75rem;
  }
  
  .timeline-tracks {
    height: 20px;
  }
  
  .timeline-track {
    min-width: 16px;
  }
  
  .track-number {
    font-size: 0.6rem;
  }
  
  .production-table-container {
    overflow-x: visible;
    overflow-y: auto;
  }
  
  .production-table {
    font-size: 0.9rem;
    display: block;
    width: 100%;
  }
  
  .production-table thead {
    display: none;
  }
  
  .production-table tbody {
    display: block;
  }
  
  .production-table tr.production-sheet-data-row {
    display: block;
    margin-bottom: 5px; /* 씬 간 아주 미세한 간격 */
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 8px;
    background: var(--bg-secondary);
  }
  
  .production-table td {
    display: block;
    width: 100%;
    padding: 6px; /* 8px에서 6px로 감소 */
    border: none;
    text-align: left;
  }
  
  /* 모바일 씬 헤더 (체크박스, 씬번호, 스위치 한 줄) */
  .mobile-scene-header {
    padding: 6px !important;
  }
  
  .mobile-header-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 8px;
  }
  
  .mobile-header-row .scene-number {
    font-weight: 600;
    color: var(--primary-color);
    font-size: 0.95rem;
    margin-right: auto;
  }
  
  /* 인라인 미디어 스위치 (작은 버전) - 더 이상 사용하지 않음 */
  .mobile-media-switch-inline {
    display: none; /* 모바일에서 개별 스위치 숨김 */
  }
  
  .media-label-small {
    font-size: 0.75rem;
    color: var(--text-secondary);
    transition: color 0.2s;
  }
  
  .media-label-small.active {
    color: var(--primary-color);
    font-weight: 600;
  }
  
  .media-switch-small {
    position: relative;
    display: inline-block;
    width: 32px;
    height: 18px;
  }
  
  .media-switch-small input {
    opacity: 0;
    width: 0;
    height: 0;
  }
  
  .switch-slider-small {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: var(--border-color);
    transition: 0.3s;
    border-radius: 18px;
  }
  
  .switch-slider-small:before {
    position: absolute;
    content: "";
    height: 14px;
    width: 14px;
    left: 2px;
    bottom: 2px;
    background-color: white;
    transition: 0.3s;
    border-radius: 50%;
  }
  
  .media-switch-small input:checked + .switch-slider-small {
    background-color: var(--primary-color);
  }
  
  .media-switch-small input:checked + .switch-slider-small:before {
    transform: translateX(14px);
  }
  
  /* 모바일 미디어 컨테이너 (너비 100%) */
  .mobile-media-container {
    width: 100% !important;
    margin-bottom: 8px;
    padding: 0 !important;
  }
  
  .mobile-media-container .scene-image-wrapper {
    width: 100% !important;
    margin: 0 !important;
    padding: 0 !important;
  }
  
  .mobile-media-container .scene-image-uploader {
    width: 100% !important;
    margin: 0 !important;
  }
  
  /* 오리지널 스크립트 섹션 - 모바일에서만 배경과 라운드 */
  .production-table td.script-col {
    padding: 10px 6px; /* 패딩 감소 */
    background: var(--bg-tertiary);
    border-radius: 6px;
    margin: 6px 0; /* 마진 감소 */
  }
  
  .production-table td.script-col:before {
    content: attr(data-label);
    font-weight: bold;
    display: block;
    margin-bottom: 6px; /* 마진 감소 */
    color: var(--text-secondary);
    font-size: 0.85rem;
  }
  
  /* 연출가이드 섹션 - 모바일에서 전체 너비 사용 */
  .production-table td.director-guide-col {
    padding: 8px 6px;
    width: 100% !important;
    max-width: none !important;  /* 전역 max-width 오버라이드 */
    min-width: auto !important;  /* 전역 min-width 오버라이드 */
    display: block;
  }
  
  /* 연출가이드 라벨 제거 - 버튼으로 대체됨 */
  .production-table td.director-guide-col:before {
    display: none;
  }
  
  /* 에셋 섹션 */
  .production-table td.assets-col {
    padding: 8px 6px;
  }
  
  .production-table td.assets-col:before {
    content: attr(data-label);
    font-weight: bold;
    display: inline-block;
    margin-bottom: 6px;
    margin-right: 8px;
    color: var(--text-secondary);
    font-size: 0.85rem;
  }
  
  .production-table td.assets-col .tag-list {
    display: inline-flex;
    flex-wrap: wrap;
    gap: 4px;
  }
  
  /* TTS 컨트롤 섹션 */
  .production-table td.tts-col {
    padding: 10px 6px; /* 패딩 감소 */
    background: var(--bg-tertiary);
    border-radius: 6px;
    margin-top: 6px; /* 마진 감소 */
  }
  
  .production-table td.tts-col .tts-controls {
    display: flex;
    align-items: center;
    gap: 6px;
  }
  
  /* 모바일 TTS 컨트롤 인라인 스타일 */
  .tts-controls.mobile-inline {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: flex-start;
    gap: 8px;
    flex-wrap: nowrap;
  }
  
  /* 모바일 컴팩트 버튼 스타일 */
  .tts-generate-btn.mobile-compact,
  .tts-play-btn.mobile-compact,
  .tts-regenerate-btn.mobile-compact,
  .tts-download-btn.mobile-compact {
    min-width: auto;
    padding: 6px 10px;
    font-size: 0.8rem;
    height: 32px;
  }
  
  .tts-play-btn.mobile-compact {
    width: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .tts-regenerate-btn.mobile-compact,
  .tts-download-btn.mobile-compact {
    width: 32px;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .tts-duration.mobile-compact {
    font-size: 0.75rem;
    white-space: nowrap;
    min-width: 35px;
  }
  
  /* 씬 구분자 행 - 모바일에서는 숨기기 */
  .scene-divider-row {
    display: none !important;
  }
  
  /* 모바일 씬 추가 플로팅 버튼 */
  .mobile-scene-divider {
    position: relative;
    height: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    z-index: 10;
    margin-top: -1px;
    margin-bottom: -1px;
  }
  
  .mobile-add-scene-floating-btn {
    position: absolute;
    top: -10px;
    padding: 1px 10px;
    font-size: 0.65rem;
    background: var(--primary-color);
    color: white;
    border: 2px solid var(--bg-primary);
    border-radius: 10px;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    white-space: nowrap;
    height: 20px;
    line-height: 16px;
  }
  
  .mobile-add-scene-floating-btn:hover {
    transform: scale(1.05);
    box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
  }
  
  /* 선택 액션 바 모바일 스타일 */
  .selection-actions {
    flex-direction: column;
    gap: 12px;
    padding: 10px;
  }
  
  .selection-buttons {
    flex-wrap: wrap;
    justify-content: flex-start;
    width: 100%;
  }
  
  .selection-buttons button {
    flex: 1 1 calc(50% - 4px);
    min-width: 120px;
    font-size: 0.85rem;
    padding: 8px 10px;
  }
  
  .scene-image-col {
    margin-bottom: 15px;
  }
  
  .scene-image-col img,
  .scene-image-col video {
    width: 100%;
    height: auto;
    max-height: none; /* 원본 비율 유지 */
    object-fit: contain;
    display: block;
  }
  
  .script-col,
  .director-guide-col,
  .assets-col,
  .tts-col {
    margin-bottom: 10px;
  }
  
  .selection-actions {
    flex-direction: column;
    gap: 10px;
    padding: 10px;
  }
  
  .selection-buttons {
    flex-wrap: wrap;
    gap: 5px;
    width: 100%;
  }
  
  .selection-buttons button {
    flex: 1 1 calc(50% - 5px);
    min-width: 100px;
    padding: 8px 10px;
    font-size: 0.85rem;
  }
  
  .production-table th,
  .production-table td {
    padding: 8px;
  }
  
  .script-col {
    min-width: 300px;
    width: 100%;
    flex: 1;
  }
  
  .tag {
    font-size: 0.8rem;
    padding: 3px 8px;
  }
  
  /* 모바일 연출가이드 버튼 스타일 (태블릿과 동일) */
  .director-guide-toggle.mobile-guide-btn {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 6px;
    padding: 6px 16px;
    color: #4ade80;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    width: auto;  /* 버튼은 자동 너비 */
  }
  
  .director-guide-toggle.mobile-guide-btn:hover {
    background: rgba(74, 222, 128, 0.15);
    border-color: rgba(74, 222, 128, 0.4);
  }
  
  .director-guide-toggle.mobile-guide-btn .toggle-icon {
    color: #4ade80;
    font-weight: 600;
  }
  
  /* 펼쳐진 콘텐츠 스타일 */
  .director-guide-content-mobile {
    margin-top: 10px;
    padding: 10px;
    background: rgba(74, 222, 128, 0.05);
    border: 1px solid rgba(74, 222, 128, 0.2);
    border-radius: 6px;
    width: 100%;
  }
  
  .director-guide-content-mobile .guide-text-wrapper {
    cursor: pointer;
    padding: 5px;
    border-radius: 4px;
    transition: background 0.2s;
  }
  
  .director-guide-content-mobile .guide-text-wrapper:hover {
    background: rgba(74, 222, 128, 0.1);
  }
  
  .director-guide-content-mobile .guide-text {
    color: #4ade80;
    line-height: 1.5;
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
  }
  
  .director-guide-content-mobile .empty-hint {
    color: rgba(74, 222, 128, 0.6);
    font-style: italic;
    display: block;
    text-align: center;
    padding: 10px;
  }
  
  .director-guide-content-mobile .edit-textarea {
    width: 100%;
    background: rgba(255, 255, 255, 0.9);
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 4px;
    padding: 8px;
    font-size: 0.9rem;
    resize: vertical;
    min-height: 80px;
  }
  
  .director-guide-content-mobile .edit-hint {
    font-size: 0.75rem;
    color: rgba(74, 222, 128, 0.8);
    margin-top: 5px;
  }
}

/* 태블릿 세로 모드 (769px - 900px): 정상 테이블 형식 유지 */
@media (min-width: 769px) and (max-width: 900px) {
  .production-table-wrapper {
    padding: 10px;
    width: 100%;
  }
  
  .production-table-container {
    width: 100%;
    overflow-x: auto;
    overflow-y: auto;
  }
  
  /* 테이블 형식 유지 - 카드 형식이 아닌 정상 테이블 */
  .production-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  
  /* thead 표시 유지 */
  .production-table thead {
    display: table-header-group;
  }
  
  /* tbody tr 정상 표시 */
  .production-table tbody tr {
    display: table-row;
  }
  
  /* td 정상 표시 */
  .production-table td {
    display: table-cell;
    padding: 10px 8px;
    border: 1px solid var(--border-color);
  }
  
  /* 이미지 적절한 크기 */
  .scene-image-col img,
  .scene-image-col video {
    width: 100%;
    height: auto;
    max-height: 150px;
    object-fit: contain;
  }

  /* 모바일 에셋 섹션 스타일 */
  .mobile-assets-section {
    margin-top: 10px;
  }

  .mobile-assets-header {
    font-weight: bold;
    margin-bottom: 8px;
    color: var(--text-secondary);
    font-size: 0.9rem;
  }

  .mobile-assets-section .assets-container {
    display: grid !important;
    grid-template-columns: repeat(2, 1fr) !important;
    gap: 8px;
  }

  .mobile-assets-section .asset-section {
    display: block !important;
    flex-direction: unset !important;
    padding: 6px;
    background: var(--bg-secondary);
    border-radius: 4px;
    font-size: 0.85rem;
    cursor: default !important;
  }

  .mobile-assets-section .asset-type-label {
    font-weight: 600;
    color: var(--text-secondary);
    margin-bottom: 4px;
    font-size: 0.8rem;
    display: block !important;
  }

  .mobile-assets-section .tag-list {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 4px;
  }

  .mobile-assets-section .asset-tag {
    display: inline-block !important;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 0.75rem;
    line-height: 1.3;
  }

  .mobile-assets-section .character-tag {
    background-color: rgba(147, 51, 234, 0.1);
    color: #9333ea;
    border: 1px solid rgba(147, 51, 234, 0.2);
  }

  .mobile-assets-section .background-tag {
    background-color: rgba(59, 130, 246, 0.1);
    color: #3b82f6;
    border: 1px solid rgba(59, 130, 246, 0.2);
  }

  .mobile-assets-section .prop-tag {
    background-color: rgba(236, 72, 153, 0.1);
    color: #ec4899;
    border: 1px solid rgba(236, 72, 153, 0.2);
  }

  .mobile-assets-section .reference-tag {
    background-color: rgba(251, 146, 60, 0.1);
    color: #fb923c;
    border: 1px solid rgba(251, 146, 60, 0.2);
  }

  .empty-assets {
    grid-column: 1 / -1;
    text-align: center;
    color: var(--text-tertiary);
    font-style: italic;
    padding: 10px;
  }

}

/* 태블릿 가로 모드 (901px - 1024px): 테이블 형식 유지, 연출가이드 접기 */
@media (min-width: 901px) and (max-width: 1024px) {
  .production-table-wrapper {
    padding: 15px;
  }
  
  /* 테이블 형식 유지 */
  .production-table {
    width: 100%;
  }
  
  /* 컬럼 너비 조정 */
  .scene-number-col {
    width: 50px;
  }
  
  .scene-image-col {
    width: 150px; /* 이미지 크기 증가 */
  }
  
  .scene-image-col img,
  .scene-image-col video {
    max-height: 120px; /* 이미지 높이 증가 */
    object-fit: cover;
  }
  
  .script-col {
    min-width: 300px;
    max-width: none; /* 최대 너비 제한 제거 */
    flex: 1 1 auto; /* 남은 공간 차지하되 다른 컬럼들도 확보 */
  }
  
  /* 연출가이드 컬럼 - 클릭해서 펼치기 */
  .director-guide-col {
    min-width: 180px;
    max-width: none; /* 최대 너비 제한 제거 */
    width: auto; /* 가용 공간 사용 */
  }
  
  .director-guide-col.tablet-view {
    cursor: pointer;
    padding: 8px;
  }
  
  .director-guide-preview {
    display: flex;
    align-items: flex-start;
    gap: 4px;
  }
  
  .preview-icon {
    flex-shrink: 0;
    font-size: 0.8rem;
    margin-top: 2px;
  }
  
  .preview-text {
    flex: 1;
    font-size: 0.85rem;
    color: var(--text-secondary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  
  .director-guide-col.expanded .director-guide-preview {
    flex-direction: column;
  }
  
  .director-guide-col.expanded .preview-text {
    display: none;
  }
  
  .director-guide-col.expanded .expanded-content {
    display: block;
    margin-top: 8px;
    padding: 8px;
    background: var(--bg-primary);
    border-radius: 6px;
    white-space: pre-wrap;
    word-break: break-word;
    font-size: 0.85rem;
  }
  
  .director-guide-col:not(.expanded) .expanded-content {
    display: none;
  }
  
  /* 에셋 컬럼 조정 */
  .assets-col {
    min-width: 180px;
  }
  
  /* TTS 컬럼 조정 */
  .tts-col {
    min-width: 150px;
  }
  
  /* 버튼 크기 조정 */
  .btn-add-row,
  .btn-delete-row {
    padding: 6px 10px;
    font-size: 0.85rem;
  }
  
  /* 선택 액션 바 조정 */
  .selection-actions {
    padding: 10px;
  }
  
  .selection-buttons button {
    padding: 8px 12px;
    font-size: 0.85rem;
  }
}

/* 시퀀스 헤더 행 스타일 */
.sequence-header-row {
  background: linear-gradient(135deg, var(--primary-color) 0%, var(--secondary-color) 100%);
  border: none;
}

.sequence-header-cell {
  padding: 10px 20px;
  text-align: left;
  border: none;
}

.sequence-header-content {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sequence-name-label {
  color: white;
  font-weight: 600;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 연출가이드 인라인 스타일 (태블릿/데스크탑) */
.director-guide-inline {
  margin-top: 12px;
}

/* 데스크탑에서는 항상 표시되도록 */
@media (min-width: 1025px) {
  .director-guide-inline {
    border-top: none;
    padding-top: 0;
  }
}

/* 태블릿 세로모드 (769px - 900px) - 추가 스타일 */
@media (min-width: 769px) and (max-width: 900px) {
  .director-guide-inline {
    display: block; /* 태블릿 세로모드에서도 인라인 가이드 표시 */
    margin-top: 10px;
  }
  
  .director-guide-toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 6px;
    padding: 6px 12px;
    color: #4ade80;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .director-guide-toggle:hover {
    background: rgba(74, 222, 128, 0.15);
    border-color: rgba(74, 222, 128, 0.4);
  }
  
  .director-guide-col .director-guide-preview {
    background: rgba(74, 222, 128, 0.1);
    border: 1px solid rgba(74, 222, 128, 0.3);
    border-radius: 6px;
    padding: 10px 12px;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .director-guide-col .director-guide-preview:hover {
    background: rgba(74, 222, 128, 0.15);
    border-color: rgba(74, 222, 128, 0.4);
  }
  
  .director-guide-col .preview-icon {
    color: #4ade80;
    font-weight: 600;
    margin-right: 6px;
  }
  
  .director-guide-col .preview-text {
    color: #4ade80;
    font-size: 0.9rem;
  }
  
  .director-guide-col .expanded-content {
    color: #4ade80;
    font-size: 0.9rem;
    margin-top: 10px;
    padding-top: 10px;
    border-top: 1px solid rgba(74, 222, 128, 0.2);
  }
  
  .director-guide-col .guide-text {
    color: #4ade80;
    line-height: 1.5;
  }
  
  /* 폰트 크기 조정 */
  .scene-header,
  .tts-header,
  .tab-btn {
    font-size: 0.9rem;
  }
  
  /* 테이블 스타일 조정 */
  .production-table th,
  .production-table td {
    padding: 10px 8px;
    font-size: 0.9rem;
  }
}

/* 태블릿 가로모드 (901px - 1024px) */
@media (min-width: 901px) and (max-width: 1024px) {
  .director-guide-inline {
    padding-top: 12px;
    border-top: 1px solid var(--border-color);
  }
}

.director-guide-toggle {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  color: #4ade80; /* 카이로스 그린 */
  transition: all 0.2s;
  font-weight: 500;
}

.director-guide-toggle:hover {
  background: rgba(74, 222, 128, 0.15);
  border-color: rgba(74, 222, 128, 0.4);
  color: #4ade80;
  transform: translateY(-1px);
  box-shadow: 0 2px 6px rgba(74, 222, 128, 0.15);
}

.toggle-icon {
  font-size: 0.75rem;
  transition: transform 0.2s;
}

.director-guide-content-inline {
  margin-top: 10px;
  padding: 14px;
  background: rgba(74, 222, 128, 0.05); /* 카이로스 그린 배경 */
  border-radius: 8px;
  border: 1px solid rgba(74, 222, 128, 0.2); /* 카이로스 그린 테두리 */
  box-shadow: 0 2px 8px rgba(74, 222, 128, 0.08);
}

.director-guide-content-inline .guide-text {
  margin: 0;
  white-space: pre-wrap;
  line-height: 1.6;
  font-size: 0.9rem; /* 스크립트보다 작은 글씨 */
  color: #4ade80; /* 카이로스 메인 그린 콜러 */
  font-weight: 400; /* 가는 폰트 */
}

.director-guide-content-inline .empty-hint {
  color: rgba(74, 222, 128, 0.6);
  font-style: italic;
  cursor: pointer;
  font-size: 0.85rem;
}

.director-guide-content-inline .empty-hint:hover {
  color: #4ade80;
}

/* 씬타입 배지 스타일 */
.scene-type-badge {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
}

.scene-type-graphics {
  background-color: rgba(59, 130, 246, 0.15);
  color: #3b82f6;
}

.scene-type-cg {
  background-color: rgba(139, 92, 246, 0.15);
  color: #8b5cf6;
}

.scene-type-archive {
  background-color: rgba(245, 158, 11, 0.15);
  color: #f59e0b;
}

.scene-type-animation {
  background-color: rgba(236, 72, 153, 0.15);
  color: #ec4899;
}

.scene-type-mixed {
  background-color: rgba(107, 114, 128, 0.15);
  color: #6b7280;
}

/* 연출가이드 스타일 */
.director-guide-content {
  /* 세로 제한 제거 - 전체 내용 표시 */
}

.guide-text {
  margin: 0;
  line-height: 1.4;
  white-space: pre-wrap;
  font-size: 0.9rem;
  color: var(--text-primary);
}

.edit-textarea {
  width: 100%;
  min-height: 80px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: inherit;
  font-size: 0.9rem;
  line-height: 1.4;
  resize: vertical;
  background-color: var(--background);
  color: var(--text-primary);
}

.edit-textarea:focus {
  outline: none;
  border-color: var(--primary-color);
}


.asset-section {
  display: flex;
  flex-direction: column;
  gap: 4px;
  position: relative;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
}

.asset-section.editable-hover {
  background-color: rgba(59, 130, 246, 0.1);
  border: 1px dashed rgba(59, 130, 246, 0.3);
}

.asset-section.editing {
  background-color: rgba(59, 130, 246, 0.15);
  border: 1px solid rgba(59, 130, 246, 0.5);
  cursor: default;
}

.asset-type-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

/* 각 에셋 타입별 컬러 */
.characters-section .asset-type-label {
  color: #3b82f6;
}

.backgrounds-section .asset-type-label {
  color: #10b981;
}

.props-section .asset-type-label {
  color: #f59e0b;
}

.keywords-section .asset-type-label {
  color: #8b5cf6;
}

/* 인라인 편집 관련 스타일 */
.edit-input-container {
  width: 100%;
}

.edit-input {
  width: 100%;
  padding: 4px 8px;
  border: 1px solid rgba(59, 130, 246, 0.5);
  border-radius: 4px;
  font-size: 0.8rem;
  background: var(--bg-primary);
  color: var(--text-primary);
  outline: none;
  resize: none;
}

.edit-input:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.empty-placeholder {
  font-size: 0.75rem;
  color: var(--text-tertiary);
  font-style: italic;
  opacity: 0.6;
}

.edit-hint {
  position: absolute;
  bottom: -18px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7rem;
  color: #3b82f6;
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 3px;
  border: 1px solid rgba(59, 130, 246, 0.3);
  white-space: nowrap;
  z-index: 10;
}

/* 에셋 필터 헤더 스타일 */
.assets-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.asset-filter-dropdown {
  position: relative;
}

.filter-toggle-btn {
  background: none;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 6px;
  cursor: pointer;
  color: var(--text-secondary);
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
}

.filter-toggle-btn:hover {
  background-color: var(--bg-secondary);
  color: var(--text-primary);
  border-color: var(--primary-color);
}

.filter-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  padding: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  min-width: 150px;
  margin-top: 4px;
}

.filter-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 0;
  cursor: pointer;
}

.filter-option input[type="checkbox"] {
  margin: 0;
  cursor: pointer;
}

.filter-option label {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.85rem;
  color: var(--text-primary);
  margin: 0;
}

.filter-color {
  display: inline-block;
  width: 10px;
  height: 10px;
  border-radius: 2px;
  margin-right: 2px;
}

.characters-color {
  background-color: #3b82f6;
}

.backgrounds-color {
  background-color: #10b981;
}

.props-color {
  background-color: #f59e0b;
}

.reference-color {
  background-color: #8b5cf6;
}

/* 태그 스타일 업데이트 */
.character-tag {
  background-color: rgba(59, 130, 246, 0.1);
  color: #3b82f6;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.background-tag {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

.prop-tag {
  background-color: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border: 1px solid rgba(245, 158, 11, 0.2);
}

.reference-keyword-tag {
  background-color: rgba(139, 92, 246, 0.1);
  color: #8b5cf6;
  border: 1px solid rgba(139, 92, 246, 0.2);
}

.reference-source-tag {
  background-color: rgba(16, 185, 129, 0.1);
  color: #10b981;
  border: 1px solid rgba(16, 185, 129, 0.2);
}

/* 편집 힌트 스타일 */
.edit-hint {
  font-size: 0.75rem;
  color: var(--text-secondary);
  margin-top: 4px;
  font-style: italic;
}
</style>