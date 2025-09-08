import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  // OPTIONS 요청 처리 (CORS preflight)
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: ''
    }
  }

  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    // 쿼리 파라미터 파싱
    const queryParams = event.queryStringParameters || {}
    const provider = queryParams.provider // 'heygen', 'elevenlabs', 'all'
    const language = queryParams.language // 'ko', 'en', 'all'
    const category = queryParams.category // 'professional', 'casual', 'news', 'character'
    
    // 기본 쿼리 구성
    let query = supabase
      .from('voice_models')
      .select('*')
      .eq('is_active', true)
    
    // 필터 적용
    if (provider && provider !== 'all') {
      query = query.eq('provider', provider)
    }
    
    if (language && language !== 'all') {
      query = query.eq('language', language)
    }
    
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }
    
    // 정렬 (정렬 순서, 이름 순)
    query = query.order('sort_order', { ascending: true })
              .order('voice_name', { ascending: true })
    
    const { data: voiceModels, error } = await query
    
    if (error) {
      console.error('Database query error:', error)
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Failed to fetch voice models',
          details: error.message 
        })
      }
    }
    
    // 커스텀 음성 모델이 없으면 추가
    const customVoiceExists = voiceModels.some(v => v.category === 'personal')
    
    if (!customVoiceExists) {
      console.log('Adding custom ElevenLabs voice models...')
      
      try {
        // 한국어 커스텀 음성 추가
        const { data: koreanVoice, error: koreanError } = await supabase
          .from('voice_models')
          .insert({
            voice_id: 'elevenlabs_custom_korean_voice',
            voice_name: '사용자 한국어 음성 (커스텀)',
            provider: 'elevenlabs',
            language: 'ko',
            gender: 'Unspecified',
            supports_emotion: false,
            supports_pause: false,
            supports_pitch: false,
            supports_speed: true,
            supports_multilingual: true,
            elevenlabs_model: 'eleven_turbo_v2_5',
            default_similarity_boost: 0.85,
            default_stability: 0.60,
            default_style: 0.10,
            description: 'ElevenLabs로 클론된 사용자 커스텀 한국어 음성',
            tags: ['custom', 'korean', 'clone', 'personal'],
            is_active: true,
            is_premium: true,
            sort_order: -10,
            category: 'personal'
          })
          .select()

        if (!koreanError && koreanVoice) {
          voiceModels.push(koreanVoice[0])
        }

        // 영어 커스텀 음성 추가
        const { data: englishVoice, error: englishError } = await supabase
          .from('voice_models')
          .insert({
            voice_id: 'elevenlabs_custom_english_voice',
            voice_name: '사용자 영어 음성 (커스텀)',
            provider: 'elevenlabs',
            language: 'en',
            gender: 'Unspecified',
            supports_emotion: false,
            supports_pause: false,
            supports_pitch: false,
            supports_speed: true,
            supports_multilingual: true,
            elevenlabs_model: 'eleven_turbo_v2_5',
            default_similarity_boost: 0.85,
            default_stability: 0.60,
            default_style: 0.10,
            description: 'ElevenLabs로 클론된 사용자 커스텀 영어 음성',
            tags: ['custom', 'english', 'clone', 'personal'],
            is_active: true,
            is_premium: true,
            sort_order: -9,
            category: 'personal'
          })
          .select()

        if (!englishError && englishVoice) {
          voiceModels.push(englishVoice[0])
        }

        console.log('Custom voice models added successfully')
        
      } catch (addError) {
        console.warn('Failed to add custom voice models:', addError.message)
      }
    }

    // HeyGen API 통합 - 실제 데이터로 업데이트
    const heygenApiKey = process.env.HEYGEN_API_KEY
    let heygenVoices = []
    
    if (heygenApiKey && (!provider || provider === 'heygen' || provider === 'all')) {
      try {
        const heygenResponse = await fetch('https://api.heygen.com/v2/voices', {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${heygenApiKey}`,
            'Accept': 'application/json'
          }
        })
        
        if (heygenResponse.ok) {
          const heygenResult = await heygenResponse.json()
          heygenVoices = heygenResult.voices || []
          console.log(`Fetched ${heygenVoices.length} voices from HeyGen API`)
        }
      } catch (heygenError) {
        console.warn('Failed to fetch from HeyGen API:', heygenError.message)
      }
    }
    
    // 데이터 병합 및 정리
    const processedVoices = voiceModels.map(model => {
      // HeyGen 실제 데이터가 있으면 업데이트
      if (model.provider === 'heygen') {
        const heygenVoice = heygenVoices.find(v => 
          v.voice_id === model.voice_id || 
          v.name.toLowerCase().includes(model.voice_name.toLowerCase())
        )
        
        if (heygenVoice) {
          return {
            ...model,
            preview_audio_url: heygenVoice.preview_audio,
            supports_emotion: heygenVoice.emotion_support || model.supports_emotion,
            supports_pause: heygenVoice.support_pause || model.supports_pause,
            supported_locales: heygenVoice.support_locale ? 
              (heygenVoice.supported_locales || model.supported_locales) : 
              model.supported_locales
          }
        }
      }
      
      return model
    })
    
    // 언어별, 제공업체별 그룹화
    const voicesByLanguage = processedVoices.reduce((acc, voice) => {
      const lang = voice.language || 'unknown'
      if (!acc[lang]) {
        acc[lang] = []
      }
      acc[lang].push(voice)
      return acc
    }, {})
    
    const voicesByProvider = processedVoices.reduce((acc, voice) => {
      const prov = voice.provider || 'unknown'
      if (!acc[prov]) {
        acc[prov] = []
      }
      acc[prov].push(voice)
      return acc
    }, {})
    
    const voicesByCategory = processedVoices.reduce((acc, voice) => {
      const cat = voice.category || 'general'
      if (!acc[cat]) {
        acc[cat] = []
      }
      acc[cat].push(voice)
      return acc
    }, {})
    
    // 언어 우선순위 정렬 (한국어 > 영어 > 기타)
    const sortedLanguages = Object.keys(voicesByLanguage).sort((a, b) => {
      if (a === 'ko') return -1
      if (b === 'ko') return 1
      if (a === 'en') return -1
      if (b === 'en') return 1
      return a.localeCompare(b)
    })
    
    // 통계 정보
    const statistics = {
      total: processedVoices.length,
      by_provider: Object.keys(voicesByProvider).map(provider => ({
        provider,
        count: voicesByProvider[provider].length
      })),
      by_language: Object.keys(voicesByLanguage).map(language => ({
        language,
        count: voicesByLanguage[language].length
      })),
      by_category: Object.keys(voicesByCategory).map(category => ({
        category,
        count: voicesByCategory[category].length
      })),
      features: {
        emotion_support: processedVoices.filter(v => v.supports_emotion).length,
        pause_support: processedVoices.filter(v => v.supports_pause).length,
        multilingual: processedVoices.filter(v => v.supports_multilingual).length,
        premium: processedVoices.filter(v => v.is_premium).length
      }
    }
    
    // 성공 응답
    const response = {
      success: true,
      voices: processedVoices,
      voices_by_language: voicesByLanguage,
      voices_by_provider: voicesByProvider,
      voices_by_category: voicesByCategory,
      languages: sortedLanguages,
      providers: Object.keys(voicesByProvider),
      categories: Object.keys(voicesByCategory),
      statistics,
      filters_applied: {
        provider: provider || 'all',
        language: language || 'all', 
        category: category || 'all'
      }
    }
    
    console.log(`Successfully processed ${processedVoices.length} voice models`)
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }
    
  } catch (error) {
    console.error('Get voice models error:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}