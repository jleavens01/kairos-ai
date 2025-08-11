<template>
  <div class="home-container">
    <header class="hero-section">
      <div class="hero-content">
        <h1 class="hero-title">AI로 만드는 창의적인 콘텐츠</h1>
        <p class="hero-subtitle">
          스크립트부터 비디오까지, AI가 당신의 아이디어를 현실로 만들어드립니다.
        </p>
        <div class="hero-actions">
          <router-link v-if="!authStore.user" to="/login" class="cta-button">
            지금 시작하기
          </router-link>
          <router-link v-if="authStore.user" to="/projects" class="cta-button">
            내 프로젝트로 이동
          </router-link>
        </div>
      </div>
    </header>

    <main>
      <section id="features" class="features-section">
        <h2 class="section-title">주요 기능</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">✨</div>
            <h3>AI 스크립트 분석</h3>
            <p>텍스트를 입력하면 AI가 자동으로 씬, 캐릭터, 배경을 분석합니다.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🎨</div>
            <h3>자동 에셋 생성</h3>
            <p>분석된 요소를 기반으로 일관된 스타일의 이미지를 생성합니다.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🎬</div>
            <h3>비디오 제작</h3>
            <p>생성된 에셋으로 자동으로 비디오를 제작합니다.</p>
          </div>
        </div>
      </section>

      <section id="how-it-works" class="how-it-works-section">
        <h2 class="section-title">제작 과정</h2>
        <div class="steps-container">
          <div class="step-card">
            <div class="step-number">1</div>
            <h3>스크립트 입력</h3>
            <p>아이디어나 스토리를 텍스트로 입력합니다.</p>
          </div>
          <div class="step-card">
            <div class="step-number">2</div>
            <h3>AI 분석</h3>
            <p>AI가 내용을 분석하고 필요한 요소를 추출합니다.</p>
          </div>
          <div class="step-card">
            <div class="step-number">3</div>
            <h3>콘텐츠 생성</h3>
            <p>이미지, 음성, 비디오를 자동으로 생성합니다.</p>
          </div>
          <div class="step-card">
            <div class="step-number">4</div>
            <h3>최종 결과물</h3>
            <p>완성된 콘텐츠를 다운로드하고 공유합니다.</p>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
</script>

<style scoped>
.home-container {
  width: 100%;
  background-color: var(--bg-primary);
  transition: background-color 0.3s;
}

.dark .home-container {
  background-color: #1a1a1a;
}

/* 히어로 섹션 */
.hero-section {
  text-align: center;
  padding: 120px 20px 80px 20px;
  background: transparent;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 20px;
  letter-spacing: -0.05em;
  background: linear-gradient(to right, #4ade80, #34d399);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-size: 1.25rem;
  max-width: 800px;
  margin: 0 auto 40px auto;
  color: var(--text-secondary);
  line-height: 1.7;
}

.cta-button {
  background: linear-gradient(to right, #4ade80, #34d399);
  color: white;
  padding: 15px 35px;
  border-radius: 50px;
  text-decoration: none;
  font-weight: bold;
  font-size: 1.1rem;
  transition: all 0.3s ease;
  display: inline-block;
  box-shadow: 0 4px 20px rgba(74, 222, 128, 0.3);
}

.cta-button:hover {
  transform: translateY(-3px);
  box-shadow: 0 7px 25px rgba(74, 222, 128, 0.5);
  background: linear-gradient(to right, #22c55e, #10b981);
}


/* 섹션 공통 스타일 */
.features-section {
  padding: 100px 20px;
  background-color: var(--bg-secondary);
}

.how-it-works-section {
  padding: 100px 20px;
  background-color: var(--bg-primary);
}

.dark .features-section {
  background-color: #1f1f1f;
}

.dark .how-it-works-section {
  background-color: #1a1a1a;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 60px;
  background: linear-gradient(to right, #4ade80, #34d399);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

/* 주요 기능 섹션 */
.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  max-width: 1200px;
  margin: 0 auto;
}

.feature-card {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 40px;
  text-align: left;
  transition: all 0.3s ease;
}

.dark .feature-card {
  background-color: #1f1f1f;
  border-color: #333;
}

.feature-card:hover {
  transform: translateY(-5px);
  border-color: var(--primary-color);
  box-shadow: 0 10px 30px rgba(74, 222, 128, 0.1);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 20px;
  color: var(--primary-color);
}

.feature-card h3 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 15px;
  color: var(--text-primary);
}

.feature-card p {
  color: var(--text-secondary);
  line-height: 1.6;
}

/* 제작 과정 섹션 */
.steps-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  max-width: 1000px;
  margin: 0 auto;
}

.step-card {
  background-color: var(--bg-primary);
  border: 1px solid var(--border-color);
  border-radius: 10px;
  padding: 30px;
  text-align: center;
  transition: all 0.3s ease;
}

.dark .step-card {
  background-color: #1f1f1f;
  border-color: #333;
}

.step-card:hover {
  transform: translateY(-3px);
  border-color: var(--primary-color);
  box-shadow: 0 8px 25px rgba(74, 222, 128, 0.1);
}

.step-number {
  width: 50px;
  height: 50px;
  background: linear-gradient(to right, #4ade80, #34d399);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0 auto 20px auto;
}

.step-card h3 {
  font-size: 1.3rem;
  font-weight: 600;
  margin-bottom: 10px;
  color: var(--text-primary);
}

.step-card p {
  font-size: 0.95rem;
  color: var(--text-secondary);
  line-height: 1.5;
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .hero-section {
    padding: 80px 15px 60px 15px;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1rem;
  }

  .cta-button {
    padding: 12px 25px;
    font-size: 1rem;
  }

  .features-section, .how-it-works-section {
    padding: 60px 15px;
  }

  .section-title {
    font-size: 2rem;
    margin-bottom: 40px;
  }

  .features-grid, .steps-container {
    grid-template-columns: 1fr;
  }

  .feature-card, .step-card {
    padding: 25px;
  }
}
</style>