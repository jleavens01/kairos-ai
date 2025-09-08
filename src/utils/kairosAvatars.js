// 카이로스 플랫폼용 선별된 아바타 번들
// HeyGen Photo Avatar Group 및 기본 아바타 사용

export const kairosDefaultAvatars = [
  // 세모지 Photo Avatar Group (커스텀 생성)
  {
    id: 'f9ed7e3d4bc14f209094c8affd6e24d4',
    name: '세상의모든지식 (세모지)',
    gender: 'neutral',
    style: 'photo',
    category: 'custom',
    groupId: 'f9ed7e3d4bc14f209094c8affd6e24d4',
    groupType: 'PHOTO',
    numLooks: 2,
    thumbnail: '/images/semoji-avatar.png',  // 로컬 이미지로 변경 (임시 URL 만료 문제)
    description: '사진으로 생성한 커스텀 아바타',
    defaultVoiceId: '436a8aa03edb42abbc44ca4b5320f784',
    trainStatus: 'ready',
    recommended: true,
    isPhotoAvatar: true  // Photo Avatar 구분용 플래그 추가
  },
  
  // 기본 HeyGen 캐릭터 아바타들
  {
    id: 'Josh_lite3_20230714',
    name: '조쉬 (Josh)',
    gender: 'male',
    style: 'character',
    category: 'character',
    thumbnail: 'https://resource.heygen.com/avatar/v3/Josh_lite3_20230714/preview.webp',
    description: '친근한 남성 캐릭터'
  },
  
  {
    id: 'Monica_inshirt_20220820',
    name: '모니카 (Monica)',
    gender: 'female',
    style: 'character',
    category: 'character',
    thumbnail: 'https://resource.heygen.com/avatar/v3/Monica_inshirt_20220820/preview.webp',
    description: '전문적인 여성 캐릭터'
  },
  
  {
    id: 'Tyler_incasual_20220721',
    name: '타일러 (Tyler)',
    gender: 'male',
    style: 'character',
    category: 'character',
    thumbnail: 'https://resource.heygen.com/avatar/v3/Tyler_incasual_20220721/preview.webp',
    description: '캐주얼한 남성 캐릭터'
  },
  
  {
    id: 'Anna_public_3_20240108',
    name: '안나 (Anna)',
    gender: 'female',
    style: 'character',
    category: 'character',
    thumbnail: 'https://resource.heygen.com/avatar/v3/Anna_public_3_20240108/preview.webp',
    description: '모던한 여성 캐릭터'
  },

  // 커스텀 아바타 (사용자 생성)
  {
    id: 'custom_avatar_placeholder',
    name: '나만의 아바타 만들기',
    gender: 'neutral',
    style: 'custom',
    category: 'custom',
    thumbnail: '/images/create-avatar-placeholder.png',
    description: '내 사진으로 아바타를 만들어보세요',
    isPlaceholder: true,
    action: 'create_photo_avatar'
  }
]

// 카테고리별 그룹핑
export const avatarCategories = {
  custom: {
    name: '나만의 아바타',
    description: '내 사진으로 만든 아바타',
    priority: 1
  },
  character: {
    name: '캐릭터 아바타',
    description: '다양한 스타일의 캐릭터 아바타',
    priority: 2
  }
}

// 추천 음성 매칭 (아바타별 추천 음성)
export const recommendedVoices = {
  // 세모지 Photo Avatar Group
  'f9ed7e3d4bc14f209094c8affd6e24d4': ['436a8aa03edb42abbc44ca4b5320f784', 'ko-KR-InJoonNeural', 'ko-KR-SunHiNeural'],
  
  // 기본 HeyGen 아바타들
  'Josh_lite3_20230714': ['ko-KR-InJoonNeural', 'en-US-GuyNeural'],
  'Monica_inshirt_20220820': ['ko-KR-SunHiNeural', 'en-US-JennyNeural'],
  'Tyler_incasual_20220721': ['ko-KR-BongJinNeural', 'en-US-DavisNeural'],
  'Anna_public_3_20240108': ['ko-KR-YunaNeural', 'en-US-AriaNeural']
}

// 아바타 필터링 헬퍼 함수
export const filterAvatarsByCategory = (category) => {
  if (category === 'all') return kairosDefaultAvatars
  return kairosDefaultAvatars.filter(avatar => avatar.category === category)
}

// 추천 아바타 가져오기
export const getRecommendedAvatars = () => {
  return kairosDefaultAvatars.filter(avatar => avatar.recommended)
}

// 아바타에 맞는 추천 음성 가져오기
export const getRecommendedVoicesForAvatar = (avatarId) => {
  return recommendedVoices[avatarId] || []
}