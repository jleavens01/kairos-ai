<template>
  <div class="projects-container">
    <div class="projects-header">
      <h1 class="page-title">내 프로젝트</h1>
      <button @click="showCreateModal = true" class="create-button">
        + 새 프로젝트
      </button>
    </div>

    <div v-if="projectsStore.loading" class="loading-container">
      <div class="loading-spinner"></div>
      <p>프로젝트를 불러오는 중...</p>
    </div>

    <div v-else-if="projectsStore.projects.length === 0" class="empty-state">
      <div class="empty-icon">📁</div>
      <h2>아직 프로젝트가 없습니다</h2>
      <p>첫 번째 프로젝트를 만들어보세요!</p>
      <button @click="showCreateModal = true" class="create-button-large">
        프로젝트 만들기
      </button>
    </div>

    <div v-else>
      <!-- 내 프로젝트 섹션 -->
      <div class="projects-section">
        <h2 class="section-title">내 프로젝트</h2>
        <div class="projects-grid">
          <div v-for="project in projectsStore.sortedProjects" :key="project.id" class="project-card">
            <div class="project-thumbnail">
              <img v-if="project.thumbnail_url" :src="project.thumbnail_url" alt="프로젝트 썸네일" />
              <div v-else class="placeholder-thumbnail">🎬</div>
            </div>
            <div class="project-info">
              <h3 class="project-title">{{ project.name }}</h3>
              <p class="project-description">{{ project.description || '설명이 없습니다' }}</p>
              <div class="project-tags" v-if="project.tags && project.tags.length">
                <span v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
              <div class="project-meta">
                <span class="project-date">{{ formatDate(project.created_at) }}</span>
                <span class="project-status" :class="project.status">
                  {{ getStatusText(project.status) }}
                </span>
              </div>
            </div>
            <div class="project-actions">
              <button @click="openProject(project.id)" class="action-button">
                열기
              </button>
              <button @click="handleEditProject(project.id)" class="action-button edit">
                편집
              </button>
              <button @click="handleDeleteProject(project.id)" class="action-button delete">
                삭제
              </button>
              <button @click="handleShareProject(project.id)" class="action-button share">
                공유
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- 공유받은 프로젝트 섹션 -->
      <div v-if="projectsStore.sharedProjects.length > 0" class="projects-section">
        <h2 class="section-title">공유받은 프로젝트</h2>
        <div class="projects-grid">
          <div v-for="project in projectsStore.sharedProjects" :key="project.id" class="project-card shared">
            <div class="project-thumbnail">
              <img v-if="project.thumbnail_url" :src="project.thumbnail_url" alt="프로젝트 썸네일" />
              <div v-else class="placeholder-thumbnail">🎬</div>
              <div class="shared-badge">공유됨</div>
            </div>
            <div class="project-info">
              <h3 class="project-title">{{ project.name }}</h3>
              <p class="project-description">{{ project.description || '설명이 없습니다' }}</p>
              <div class="project-tags" v-if="project.tags && project.tags.length">
                <span v-for="tag in project.tags" :key="tag" class="tag">{{ tag }}</span>
              </div>
              <div class="project-meta">
                <span class="project-date">{{ formatDate(project.created_at) }}</span>
                <span class="project-permission" :class="project.permission_level">
                  {{ getPermissionText(project.permission_level) }}
                </span>
              </div>
            </div>
            <div class="project-actions">
              <button @click="openProject(project.id)" class="action-button">
                열기
              </button>
              <button v-if="project.permission_level === 'editor'" @click="handleEditProject(project.id)" class="action-button edit">
                편집
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 프로젝트 생성 모달 -->
    <CreateProjectModal 
      :show="showCreateModal" 
      @close="showCreateModal = false"
      @created="handleProjectCreated"
    />
    
    <!-- 닉네임 설정 모달 -->
    <NicknameSetupModal
      :show="showNicknameModal"
      @close="showNicknameModal = false"
      @success="() => showNicknameModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useProjectsStore } from '@/stores/projects';
import { useProfileStore } from '@/stores/profile';
import CreateProjectModal from '@/components/CreateProjectModal.vue';
import NicknameSetupModal from '@/components/NicknameSetupModal.vue';

const router = useRouter();
const projectsStore = useProjectsStore();
const profileStore = useProfileStore();

const showCreateModal = ref(false);
const showNicknameModal = ref(false);

onMounted(async () => {
  await Promise.all([
    projectsStore.fetchProjects(),
    projectsStore.fetchSharedProjects()
  ]);
  
  // 닉네임이 설정되지 않았으면 모달 표시
  if (profileStore.currentProfile && !profileStore.currentProfile.nickname) {
    showNicknameModal.value = true;
  }
});

const handleProjectCreated = (project) => {
  // 프로젝트가 생성되면 목록이 자동으로 업데이트됨 (스토어에서 처리)
  console.log('프로젝트 생성됨:', project);
};

const openProject = (projectId) => {
  // 프로젝트 상세 페이지로 이동
  router.push(`/projects/${projectId}`);
};

const handleEditProject = (projectId) => {
  // 프로젝트 편집 (추후 구현)
  console.log('프로젝트 편집:', projectId);
  // 편집 모달을 열거나 편집 페이지로 이동
};

const handleDeleteProject = async (projectId) => {
  if (confirm('정말로 이 프로젝트를 삭제하시겠습니까?\n삭제된 프로젝트는 복구할 수 없습니다.')) {
    const result = await projectsStore.deleteProject(projectId);
    if (!result.success) {
      alert('프로젝트 삭제 중 오류가 발생했습니다.');
    }
  }
};

const formatDate = (date) => {
  return new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const getStatusText = (status) => {
  const statusMap = {
    draft: '작업 중',
    processing: '처리 중',
    completed: '완료',
    failed: '실패'
  };
  return statusMap[status] || status;
};

const getPermissionText = (permission) => {
  const permissionMap = {
    viewer: '뷰어',
    editor: '편집자'
  };
  return permissionMap[permission] || permission;
};

const handleShareProject = (projectId) => {
  const email = prompt('공유할 사용자의 이메일을 입력하세요:');
  if (email && email.trim()) {
    shareProject(projectId, email.trim());
  }
};

const shareProject = async (projectId, email) => {
  const result = await projectsStore.shareProject(projectId, email);
  if (result.success) {
    alert('프로젝트가 성공적으로 공유되었습니다.');
  } else {
    alert(`공유 실패: ${result.error}`);
  }
};
</script>

<style scoped>
.projects-container {
  padding: 30px;
  max-width: 1200px;
  margin: 0 auto;
  min-height: 100vh;
  background-color: var(--bg-primary);
}

.projects-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 40px;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: var(--text-primary);
}

.create-button {
  padding: 12px 24px;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.create-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.loading-container {
  text-align: center;
  padding: 60px;
  color: var(--text-primary);
}

.loading-spinner {
  width: 50px;
  height: 50px;
  border: 3px solid var(--border-color);
  border-top: 3px solid var(--primary-color);
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin: 0 auto 20px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 80px 20px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 20px;
}

.empty-state h2 {
  font-size: 1.8rem;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.empty-state p {
  color: var(--text-secondary);
  margin-bottom: 30px;
}

.create-button-large {
  padding: 15px 35px;
  background: var(--primary-gradient);
  color: white;
  border: none;
  border-radius: 5px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.create-button-large:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(74, 222, 128, 0.3);
}

.projects-section {
  margin-bottom: 50px;
}

.section-title {
  font-size: 1.8rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 30px;
  padding-left: 10px;
  border-left: 4px solid var(--primary-color);
}

.projects-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 30px;
}

.project-card {
  background: var(--bg-primary);
  border-radius: 10px;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
  border: 1px solid var(--border-color);
}

.project-card:hover {
  transform: translateY(-5px);
  box-shadow: var(--shadow-md);
}

.project-thumbnail {
  height: 200px;
  background-color: var(--bg-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
}

.project-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-thumbnail {
  font-size: 4rem;
  color: var(--text-light);
}

.project-info {
  padding: 20px;
}

.project-title {
  font-size: 1.3rem;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.project-description {
  color: var(--text-secondary);
  margin-bottom: 10px;
  line-height: 1.5;
}

.project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-bottom: 15px;
}

.tag {
  display: inline-block;
  padding: 3px 8px;
  background-color: var(--bg-secondary);
  color: var(--text-secondary);
  border-radius: 3px;
  font-size: 0.8rem;
  border: 1px solid var(--border-color);
}

.project-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.project-date {
  color: var(--text-light);
}

.project-status {
  padding: 4px 12px;
  border-radius: 15px;
  font-size: 0.85rem;
  font-weight: 500;
}

.project-status.draft {
  background-color: var(--warning-color);
  color: white;
}

.project-status.processing {
  background-color: var(--info-color);
  color: white;
}

.project-status.completed {
  background-color: var(--success-color);
  color: white;
}

.project-status.failed {
  background-color: var(--danger-color);
  color: white;
}

.project-actions {
  padding: 15px 20px;
  background-color: var(--bg-secondary);
  display: flex;
  gap: 10px;
  border-top: 1px solid var(--border-color);
}

.action-button {
  flex: 1;
  padding: 8px 16px;
  border: 1px solid var(--border-color);
  background-color: var(--bg-primary);
  color: var(--text-primary);
  border-radius: 5px;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s;
}

.action-button:hover {
  background: var(--primary-gradient);
  color: white;
  border-color: transparent;
}

.action-button.edit:hover {
  background-color: var(--text-secondary);
  color: white;
  border-color: var(--text-secondary);
}

.action-button.delete:hover {
  background-color: var(--danger-color);
  border-color: var(--danger-color);
}

/* 공유 프로젝트 스타일 */
.project-card.shared {
  border: 2px solid var(--primary-color);
  background: linear-gradient(135deg, var(--card-bg) 0%, rgba(74, 222, 128, 0.05) 100%);
}

.shared-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: var(--primary-color);
  color: white;
  padding: 4px 8px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 600;
}

.project-permission {
  background: var(--primary-color);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.project-permission.viewer {
  background: var(--secondary-color);
}

.action-button.share {
  background: var(--primary-color);
  color: white;
}

.action-button.share:hover {
  background: var(--primary-dark);
}

/* 모바일 반응형 */
@media (max-width: 768px) {
  .projects-container {
    padding: 20px;
  }

  .projects-header {
    flex-direction: column;
    gap: 20px;
  }

  .page-title {
    font-size: 2rem;
  }

  .create-button {
    width: 100%;
  }

  .projects-grid {
    grid-template-columns: 1fr;
  }
}
</style>