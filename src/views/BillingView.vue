<template>
  <div class="billing-container">
    <div class="billing-header">
      <h1>결제 및 크레딧</h1>
      <p class="subtitle">멤버십을 업그레이드하고 크레딧을 충전하세요</p>
    </div>

    <!-- 현재 플랜 정보 -->
    <div class="current-plan-card">
      <div class="card-header">
        <h2>현재 플랜</h2>
      </div>
      <div class="card-body">
        <div class="plan-info">
          <div class="plan-name">
            <span class="tier-icon">{{ getTierIcon(profileStore.currentTier) }}</span>
            <h3>{{ getTierName(profileStore.currentTier) }} 플랜</h3>
          </div>
          <div class="plan-details">
            <div class="detail-item">
              <span class="label">남은 크레딧</span>
              <span class="value" :class="{ 'low': profileStore.isCreditsLow }">
                {{ profileStore.availableCredits.toLocaleString() }}
              </span>
            </div>
            <div class="detail-item">
              <span class="label">월 사용 한도</span>
              <span class="value">{{ getMonthlyLimit(profileStore.currentTier) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">다음 결제일</span>
              <span class="value">{{ getNextBillingDate() }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 크레딧 충전 -->
    <div class="credits-section">
      <h2>크레딧 충전</h2>
      <div class="credits-options">
        <div v-for="option in creditOptions" 
             :key="option.id"
             class="credit-option"
             :class="{ selected: selectedCredit === option.id }"
             @click="selectedCredit = option.id">
          <div class="credit-amount">
            <span class="amount">{{ option.credits.toLocaleString() }}</span>
            <span class="unit">크레딧</span>
          </div>
          <div class="credit-price">
            <span class="price">₩{{ option.price.toLocaleString() }}</span>
            <span v-if="option.bonus" class="bonus">+{{ option.bonus }}% 보너스</span>
          </div>
          <div v-if="option.popular" class="popular-badge">인기</div>
        </div>
      </div>
      <button class="btn-primary purchase-btn" @click="purchaseCredits">크레딧 구매하기</button>
    </div>

    <!-- 멤버십 플랜 -->
    <div class="membership-section">
      <h2>멤버십 플랜</h2>
      <div class="plans-grid">
        <div v-for="plan in membershipPlans" 
             :key="plan.id"
             class="plan-card"
             :class="{ 
               'current': plan.id === profileStore.currentTier,
               'recommended': plan.recommended 
             }">
          <div v-if="plan.recommended" class="recommended-badge">추천</div>
          
          <div class="plan-header">
            <span class="plan-icon">{{ plan.icon }}</span>
            <h3>{{ plan.name }}</h3>
            <div class="plan-price">
              <span class="currency">₩</span>
              <span class="amount">{{ plan.price.toLocaleString() }}</span>
              <span class="period">/월</span>
            </div>
          </div>

          <ul class="plan-features">
            <li v-for="feature in plan.features" :key="feature">
              <span class="check-icon">✓</span>
              {{ feature }}
            </li>
          </ul>

          <button v-if="plan.id !== profileStore.currentTier"
                  class="btn-plan"
                  :class="{ 'btn-primary': plan.recommended }"
                  @click="selectPlan(plan)">
            {{ plan.id === 'free' ? '다운그레이드' : '업그레이드' }}
          </button>
          <div v-else class="current-plan-label">현재 플랜</div>
        </div>
      </div>
    </div>

    <!-- 결제 내역 -->
    <div class="history-section">
      <div class="section-header">
        <h2>결제 내역</h2>
        <button class="btn-link">전체 보기</button>
      </div>
      
      <div class="history-table">
        <table>
          <thead>
            <tr>
              <th>날짜</th>
              <th>내용</th>
              <th>금액</th>
              <th>상태</th>
              <th>영수증</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="transaction in recentTransactions" :key="transaction.id">
              <td>{{ formatDate(transaction.date) }}</td>
              <td>{{ transaction.description }}</td>
              <td>₩{{ transaction.amount.toLocaleString() }}</td>
              <td>
                <span class="status-badge" :class="transaction.status">
                  {{ getStatusText(transaction.status) }}
                </span>
              </td>
              <td>
                <button class="btn-link">다운로드</button>
              </td>
            </tr>
            <tr v-if="recentTransactions.length === 0">
              <td colspan="5" class="empty-state">결제 내역이 없습니다</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useProfileStore } from '@/stores/profile'

const profileStore = useProfileStore()

const selectedCredit = ref('credit-2')
const recentTransactions = ref([])

const creditOptions = [
  { id: 'credit-1', credits: 1000, price: 10000 },
  { id: 'credit-2', credits: 3000, price: 27000, bonus: 10, popular: true },
  { id: 'credit-3', credits: 5000, price: 42500, bonus: 15 },
  { id: 'credit-4', credits: 10000, price: 80000, bonus: 20 }
]

const membershipPlans = [
  {
    id: 'free',
    name: 'Free',
    icon: '✨',
    price: 0,
    features: [
      '월 100 크레딧',
      '기본 기능 사용',
      '최대 3개 프로젝트',
      '커뮤니티 지원'
    ]
  },
  {
    id: 'basic',
    name: 'Basic',
    icon: '⭐',
    price: 9900,
    features: [
      '월 1,000 크레딧',
      '모든 기본 기능',
      '최대 10개 프로젝트',
      '이메일 지원',
      '프로젝트 공유'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: '💎',
    price: 29900,
    recommended: true,
    features: [
      '월 5,000 크레딧',
      '모든 Pro 기능',
      '무제한 프로젝트',
      '우선 지원',
      '팀 협업 기능',
      'API 액세스'
    ]
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    icon: '👑',
    price: 99900,
    features: [
      '월 20,000 크레딧',
      '모든 기능 포함',
      '무제한 프로젝트',
      '전담 지원',
      '커스텀 기능',
      'SLA 보장'
    ]
  }
]

onMounted(async () => {
  await profileStore.fetchProfile()
  // 결제 내역 불러오기 (추후 구현)
  loadTransactionHistory()
})

const getTierIcon = (tier) => {
  const icons = {
    free: '✨',
    basic: '⭐',
    pro: '💎',
    enterprise: '👑'
  }
  return icons[tier] || '✨'
}

const getTierName = (tier) => {
  const names = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
    enterprise: 'Enterprise'
  }
  return names[tier] || 'Free'
}

const getMonthlyLimit = (tier) => {
  const limits = {
    free: '100 크레딧',
    basic: '1,000 크레딧',
    pro: '5,000 크레딧',
    enterprise: '20,000 크레딧'
  }
  return limits[tier] || '100 크레딧'
}

const getNextBillingDate = () => {
  const nextMonth = new Date()
  nextMonth.setMonth(nextMonth.getMonth() + 1)
  nextMonth.setDate(1)
  return nextMonth.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })
}

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const getStatusText = (status) => {
  const statusMap = {
    completed: '완료',
    pending: '대기중',
    failed: '실패'
  }
  return statusMap[status] || status
}

const purchaseCredits = () => {
  const selected = creditOptions.find(opt => opt.id === selectedCredit.value)
  console.log('크레딧 구매:', selected)
  // 결제 프로세스 구현 (추후)
}

const selectPlan = (plan) => {
  console.log('플랜 선택:', plan)
  // 플랜 변경 프로세스 구현 (추후)
}

const loadTransactionHistory = () => {
  // 실제 API 호출로 대체 예정
  recentTransactions.value = [
    {
      id: 1,
      date: new Date('2024-01-15'),
      description: 'Pro 플랜 월 구독',
      amount: 29900,
      status: 'completed'
    },
    {
      id: 2,
      date: new Date('2024-01-10'),
      description: '3,000 크레딧 충전',
      amount: 27000,
      status: 'completed'
    }
  ]
}
</script>

<style scoped>
.billing-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px;
}

.billing-header {
  margin-bottom: 40px;
}

.billing-header h1 {
  font-size: 2rem;
  color: var(--text-primary);
  margin-bottom: 8px;
  font-weight: 600;
}

.subtitle {
  color: var(--text-secondary);
  font-size: 1.1rem;
}

/* 현재 플랜 카드 */
.current-plan-card {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 40px;
  box-shadow: var(--shadow-sm);
}

.card-header {
  padding: 20px;
  border-bottom: 1px solid var(--border-color);
  background: var(--bg-secondary);
}

.card-header h2 {
  margin: 0;
  font-size: 1.3rem;
  color: var(--text-primary);
  font-weight: 600;
}

.card-body {
  padding: 25px;
}

.plan-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.plan-name {
  display: flex;
  align-items: center;
  gap: 12px;
}

.tier-icon {
  font-size: 2rem;
}

.plan-name h3 {
  margin: 0;
  font-size: 1.5rem;
  background: var(--primary-gradient);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.plan-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.detail-item .label {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.detail-item .value {
  font-size: 1.2rem;
  font-weight: 600;
  color: var(--text-primary);
}

.detail-item .value.low {
  color: var(--warning-color);
}

/* 크레딧 섹션 */
.credits-section {
  margin-bottom: 40px;
}

.credits-section h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 20px;
  font-weight: 600;
}

.credits-options {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 15px;
  margin-bottom: 20px;
}

.credit-option {
  position: relative;
  padding: 20px;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.credit-option:hover {
  border-color: var(--primary-color);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.2);
}

.credit-option.selected {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.05), rgba(52, 211, 153, 0.05));
}

.credit-amount {
  margin-bottom: 10px;
}

.credit-amount .amount {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--text-primary);
}

.credit-amount .unit {
  font-size: 0.9rem;
  color: var(--text-secondary);
  margin-left: 5px;
}

.credit-price .price {
  font-size: 1.1rem;
  color: var(--text-primary);
  font-weight: 500;
}

.bonus {
  display: inline-block;
  margin-left: 8px;
  padding: 2px 8px;
  background: rgba(74, 222, 128, 0.2);
  color: var(--success-color);
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.popular-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 4px 10px;
  background: var(--primary-gradient);
  color: white;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.purchase-btn {
  width: 100%;
  padding: 15px;
  font-size: 1.1rem;
  font-weight: 600;
}

/* 멤버십 섹션 */
.membership-section {
  margin-bottom: 40px;
}

.membership-section h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  margin-bottom: 20px;
  font-weight: 600;
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}

.plan-card {
  position: relative;
  background: var(--bg-primary);
  border: 2px solid var(--border-color);
  border-radius: 10px;
  padding: 25px;
  transition: all 0.3s;
}

.plan-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
}

.plan-card.current {
  border-color: var(--text-secondary);
}

.plan-card.recommended {
  border-color: var(--primary-color);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.02), rgba(52, 211, 153, 0.02));
}

.recommended-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  padding: 4px 16px;
  background: var(--primary-gradient);
  color: white;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 600;
}

.plan-header {
  text-align: center;
  margin-bottom: 25px;
}

.plan-icon {
  font-size: 2.5rem;
  display: block;
  margin-bottom: 10px;
}

.plan-header h3 {
  margin: 0 0 15px 0;
  font-size: 1.3rem;
  color: var(--text-primary);
}

.plan-price {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 3px;
}

.plan-price .currency {
  font-size: 1rem;
  color: var(--text-secondary);
}

.plan-price .amount {
  font-size: 2rem;
  font-weight: bold;
  color: var(--text-primary);
}

.plan-price .period {
  font-size: 0.9rem;
  color: var(--text-secondary);
}

.plan-features {
  list-style: none;
  padding: 0;
  margin: 0 0 25px 0;
}

.plan-features li {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

.plan-features li:last-child {
  border-bottom: none;
}

.check-icon {
  color: var(--success-color);
  font-weight: bold;
}

.btn-plan {
  width: 100%;
  padding: 12px;
  border: 2px solid var(--primary-color);
  background: transparent;
  color: var(--primary-color);
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-plan:hover {
  background: var(--primary-gradient);
  color: white;
  border-color: transparent;
}

.btn-plan.btn-primary {
  background: var(--primary-gradient);
  color: white;
  border-color: transparent;
}

.btn-plan.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.current-plan-label {
  text-align: center;
  padding: 12px;
  background: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 5px;
  font-weight: 500;
}

/* 결제 내역 섹션 */
.history-section {
  margin-bottom: 40px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 1.5rem;
  color: var(--text-primary);
  font-weight: 600;
  margin: 0;
}

.history-table {
  background: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
}

thead {
  background: var(--bg-secondary);
  border-bottom: 1px solid var(--border-color);
}

th {
  padding: 15px;
  text-align: left;
  font-weight: 600;
  color: var(--text-primary);
  font-size: 0.9rem;
}

td {
  padding: 15px;
  color: var(--text-primary);
  border-bottom: 1px solid var(--border-color);
}

tbody tr:last-child td {
  border-bottom: none;
}

.status-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 500;
}

.status-badge.completed {
  background: rgba(74, 222, 128, 0.2);
  color: var(--success-color);
}

.status-badge.pending {
  background: rgba(251, 191, 36, 0.2);
  color: var(--warning-color);
}

.status-badge.failed {
  background: rgba(239, 68, 68, 0.2);
  color: var(--danger-color);
}

.btn-link {
  background: none;
  border: none;
  color: var(--primary-color);
  cursor: pointer;
  font-weight: 500;
  text-decoration: none;
  padding: 0;
}

.btn-link:hover {
  text-decoration: underline;
}

.btn-primary {
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 5px;
  padding: 10px 20px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.empty-state {
  text-align: center;
  color: var(--text-secondary);
  padding: 40px !important;
}

@media (max-width: 768px) {
  .billing-container {
    padding: 20px 15px;
  }

  .plans-grid {
    grid-template-columns: 1fr;
  }

  .credits-options {
    grid-template-columns: 1fr;
  }

  .plan-details {
    grid-template-columns: 1fr;
  }

  .history-table {
    overflow-x: auto;
  }

  table {
    min-width: 600px;
  }
}
</style>