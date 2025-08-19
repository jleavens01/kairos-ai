<template>
  <div class="channel-profile-manager">
    <!-- 헤더 -->
    <div class="manager-header">
      <div class="header-left">
        <Tv :size="24" />
        <h2>채널 프로필 관리</h2>
        <Badge variant="primary">{{ activeChannel.name }}</Badge>
      </div>
      <div class="header-actions">
        <button @click="showChannelSelector = true" class="btn-secondary">
          <SwitchCamera :size="16" />
          채널 변경
        </button>
        <button @click="exportProfile" class="btn-primary">
          <Download :size="16" />
          프로필 내보내기
        </button>
      </div>
    </div>

    <!-- 채널 정보 카드 -->
    <div class="channel-info-card">
      <div class="info-section">
        <h3>채널 정체성</h3>
        <div class="info-grid">
          <div class="info-item">
            <label>미션</label>
            <p>{{ profile.contentIdentity.mission }}</p>
          </div>
          <div class="info-item">
            <label>비전</label>
            <p>{{ profile.contentIdentity.vision }}</p>
          </div>
          <div class="info-item full-width">
            <label>핵심 가치</label>
            <div class="value-tags">
              <span v-for="value in profile.contentIdentity.coreValues" :key="value" class="value-tag">
                {{ value.split(':')[0] }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="info-section">
        <h3>타겟 오디언스</h3>
        <div class="audience-info">
          <div class="audience-primary">
            <Target :size="16" />
            <strong>주요 타겟:</strong> {{ profile.channelInfo.targetAudience.primary }}
          </div>
          <div class="audience-characteristics">
            <label>특성</label>
            <ul>
              <li v-for="char in profile.channelInfo.targetAudience.characteristics" :key="char">
                {{ char }}
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>

    <!-- 콘텐츠 카테고리 분포 -->
    <div class="category-distribution">
      <h3>콘텐츠 카테고리 분포</h3>
      <div class="category-chart">
        <div 
          v-for="(cat, key) in profile.contentCategories" 
          :key="key"
          class="category-bar"
          :style="{ '--weight': cat.weight }"
        >
          <div class="bar-fill" :style="{ width: `${cat.weight * 100}%` }">
            <span class="bar-label">{{ key }}</span>
            <span class="bar-value">{{ (cat.weight * 100).toFixed(0) }}%</span>
          </div>
          <div class="category-topics">
            <span v-for="topic in cat.topics.slice(0, 3)" :key="topic" class="topic-tag">
              {{ topic }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 톤앤매너 가이드 -->
    <div class="tone-manner-guide">
      <h3>톤 & 매너 가이드</h3>
      <div class="guide-grid">
        <div class="guide-card">
          <h4>
            <Edit3 :size="16" />
            작성 스타일
          </h4>
          <div class="style-attributes">
            <div class="attribute">
              <label>톤</label>
              <span>{{ profile.toneAndManner.writingStyle.tone }}</span>
            </div>
            <div class="attribute">
              <label>보이스</label>
              <span>{{ profile.toneAndManner.writingStyle.voice }}</span>
            </div>
            <div class="attribute">
              <label>속도</label>
              <span>{{ profile.toneAndManner.writingStyle.pace }}</span>
            </div>
          </div>
          <div class="style-characteristics">
            <h5>특징</h5>
            <ul>
              <li v-for="char in profile.toneAndManner.writingStyle.characteristics.slice(0, 3)" :key="char">
                {{ char }}
              </li>
            </ul>
          </div>
        </div>

        <div class="guide-card">
          <h4>
            <Palette :size="16" />
            비주얼 스타일
          </h4>
          <div class="color-palette">
            <div 
              v-for="color in profile.toneAndManner.visualStyle.primaryColors" 
              :key="color"
              class="color-swatch"
              :style="{ backgroundColor: color }"
              :title="color"
            ></div>
          </div>
          <div class="visual-preferences">
            <h5>선호 스타일</h5>
            <ul>
              <li v-for="pref in profile.toneAndManner.visualStyle.preferences.slice(0, 3)" :key="pref">
                {{ pref }}
              </li>
            </ul>
          </div>
        </div>

        <div class="guide-card">
          <h4>
            <BookOpen :size="16" />
            내러티브 구조
          </h4>
          <div class="narrative-flow">
            <div class="flow-item">
              <span class="flow-stage">오프닝</span>
              <span class="flow-desc">{{ profile.toneAndManner.narrativeStructure.opening }}</span>
            </div>
            <div class="flow-item">
              <span class="flow-stage">전개</span>
              <span class="flow-desc">{{ profile.toneAndManner.narrativeStructure.development }}</span>
            </div>
            <div class="flow-item">
              <span class="flow-stage">클라이맥스</span>
              <span class="flow-desc">{{ profile.toneAndManner.narrativeStructure.climax }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 금기사항 -->
    <div class="restrictions-section">
      <h3>
        <AlertCircle :size="18" />
        금기사항
      </h3>
      <div class="restrictions-grid">
        <div class="restriction-list absolute">
          <h4>절대 금지</h4>
          <ul>
            <li v-for="item in profile.restrictions.absolute" :key="item">
              {{ item }}
            </li>
          </ul>
        </div>
        <div class="restriction-list careful">
          <h4>주의 필요</h4>
          <ul>
            <li v-for="item in profile.restrictions.careful" :key="item">
              {{ item }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- 채널 선택 모달 -->
    <div v-if="showChannelSelector" class="modal-overlay" @click.self="showChannelSelector = false">
      <div class="modal-container channel-selector-modal">
        <div class="modal-header">
          <h3>채널 선택</h3>
          <button @click="showChannelSelector = false" class="close-btn">
            <X :size="20" />
          </button>
        </div>
        <div class="modal-body">
          <div class="channel-list">
            <div 
              v-for="channel in availableChannels" 
              :key="channel.id"
              class="channel-option"
              :class="{ active: channel.id === activeChannel.id }"
              @click="selectChannel(channel.id)"
            >
              <div class="channel-icon">
                <Tv :size="24" />
              </div>
              <div class="channel-details">
                <h4>{{ channel.name }}</h4>
                <p>{{ channel.category }}</p>
              </div>
              <Check v-if="channel.id === activeChannel.id" :size="20" class="check-icon" />
            </div>
          </div>
          <div class="modal-footer">
            <button @click="showImportDialog = true" class="btn-secondary">
              <Upload :size="16" />
              새 채널 가져오기
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { 
  Tv, SwitchCamera, Download, Target, Edit3, Palette, 
  BookOpen, AlertCircle, X, Check, Upload, Badge
} from 'lucide-vue-next'
import channelManager from '@/services/channelManager'
import WorldKnowledgeProfile from '@/config/channelProfiles/world-knowledge'

// State
const showChannelSelector = ref(false)
const showImportDialog = ref(false)
const activeChannelId = ref('world-knowledge')
const availableChannels = ref([
  {
    id: 'world-knowledge',
    name: '세상의모든지식',
    category: '교육/지식'
  }
])

// Computed
const profile = computed(() => {
  return channelManager.getActiveProfile() || WorldKnowledgeProfile
})

const activeChannel = computed(() => {
  return availableChannels.value.find(c => c.id === activeChannelId.value) || availableChannels.value[0]
})

// Methods
const selectChannel = (channelId) => {
  activeChannelId.value = channelId
  channelManager.setActiveChannel(channelId)
  showChannelSelector.value = false
}

const exportProfile = () => {
  const profileData = channelManager.exportChannelProfile(activeChannelId.value)
  const blob = new Blob([JSON.stringify(profileData, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${activeChannelId.value}-profile.json`
  a.click()
  URL.revokeObjectURL(url)
}

// Lifecycle
onMounted(() => {
  // 기본 채널 설정
  channelManager.setActiveChannel('world-knowledge')
})
</script>

<style scoped>
.channel-profile-manager {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.manager-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h2 {
  margin: 0;
  font-size: 20px;
  color: var(--text-primary);
}

.header-actions {
  display: flex;
  gap: 12px;
}

.btn-secondary {
  padding: 8px 16px;
  background: var(--bg-secondary);
  border: 1px solid var(--border-color);
  border-radius: 6px;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: var(--bg-hover);
}

.btn-primary {
  padding: 8px 16px;
  background: var(--primary-color);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 0.2s;
}

.btn-primary:hover {
  opacity: 0.9;
}

.channel-info-card {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 32px;
}

.info-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.info-grid {
  display: grid;
  gap: 16px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-item.full-width {
  grid-column: span 2;
}

.info-item label {
  font-size: 12px;
  color: var(--text-secondary);
  font-weight: 500;
}

.info-item p {
  margin: 0;
  font-size: 14px;
  color: var(--text-primary);
  line-height: 1.5;
}

.value-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.value-tag {
  padding: 4px 8px;
  background: var(--primary-color);
  color: white;
  border-radius: 4px;
  font-size: 12px;
}

.audience-info {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.audience-primary {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-primary);
}

.audience-characteristics ul {
  margin: 8px 0 0 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--text-secondary);
}

.category-distribution {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
}

.category-distribution h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.category-chart {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.category-bar {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.bar-fill {
  height: 32px;
  background: linear-gradient(90deg, var(--primary-color), #667eea);
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  color: white;
  font-size: 13px;
  transition: width 0.3s ease;
}

.bar-label {
  font-weight: 500;
  text-transform: capitalize;
}

.category-topics {
  display: flex;
  gap: 6px;
  margin-left: 12px;
}

.topic-tag {
  padding: 2px 6px;
  background: var(--bg-secondary);
  border-radius: 3px;
  font-size: 11px;
  color: var(--text-secondary);
}

.tone-manner-guide {
  background: white;
  border: 1px solid var(--border-color);
  border-radius: 8px;
  padding: 24px;
  margin-bottom: 24px;
}

.tone-manner-guide h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.guide-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.guide-card {
  padding: 16px;
  background: var(--bg-secondary);
  border-radius: 6px;
}

.guide-card h4 {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.style-attributes {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.attribute {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
}

.attribute label {
  color: var(--text-secondary);
}

.attribute span {
  color: var(--text-primary);
  font-weight: 500;
}

.style-characteristics h5,
.visual-preferences h5 {
  margin: 0 0 8px 0;
  font-size: 12px;
  color: var(--text-secondary);
}

.style-characteristics ul,
.visual-preferences ul {
  margin: 0;
  padding-left: 16px;
  font-size: 12px;
  color: var(--text-primary);
}

.color-palette {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}

.color-swatch {
  width: 32px;
  height: 32px;
  border-radius: 4px;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.narrative-flow {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.flow-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.flow-stage {
  font-size: 11px;
  color: var(--text-secondary);
  font-weight: 500;
}

.flow-desc {
  font-size: 12px;
  color: var(--text-primary);
}

.restrictions-section {
  background: #fff5f5;
  border: 1px solid #ffdddd;
  border-radius: 8px;
  padding: 24px;
}

.restrictions-section h3 {
  margin: 0 0 20px 0;
  font-size: 16px;
  color: #d32f2f;
  display: flex;
  align-items: center;
  gap: 8px;
}

.restrictions-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
}

.restriction-list h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: var(--text-primary);
}

.restriction-list ul {
  margin: 0;
  padding-left: 20px;
  font-size: 13px;
  color: var(--text-secondary);
}

.restriction-list.absolute ul {
  color: #d32f2f;
}

.restriction-list.careful ul {
  color: #f57c00;
}

/* 모달 스타일 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  max-height: 80vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.channel-selector-modal {
  width: 500px;
}

.modal-header {
  padding: 20px 24px;
  border-bottom: 1px solid var(--border-color);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  margin: 0;
  font-size: 18px;
  color: var(--text-primary);
}

.close-btn {
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px;
  border-radius: 4px;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--bg-secondary);
}

.modal-body {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.channel-option {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: var(--bg-secondary);
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.channel-option:hover {
  background: var(--bg-hover);
}

.channel-option.active {
  border-color: var(--primary-color);
  background: rgba(74, 222, 128, 0.1);
}

.channel-icon {
  width: 48px;
  height: 48px;
  background: white;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary-color);
}

.channel-details {
  flex: 1;
}

.channel-details h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  color: var(--text-primary);
}

.channel-details p {
  margin: 0;
  font-size: 13px;
  color: var(--text-secondary);
}

.check-icon {
  color: var(--primary-color);
}

.modal-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-color);
}
</style>