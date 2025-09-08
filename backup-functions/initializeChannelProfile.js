import { createClient } from '@supabase/supabase-js'
import { WorldKnowledgeProfile } from '../../src/config/channelProfiles/world-knowledge.js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event) => {
  // CORS 헤더
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' })
    }
  }

  try {
    // 세상의모든지식 채널 프로필이 이미 있는지 확인
    const { data: existing, error: checkError } = await supabase
      .from('channel_profiles')
      .select('id')
      .eq('channel_id', 'world-knowledge')
      .single()

    if (existing) {
      // 이미 존재하면 업데이트
      const { data, error } = await supabase
        .from('channel_profiles')
        .update({
          channel_name: WorldKnowledgeProfile.channelInfo.name,
          profile_data: WorldKnowledgeProfile,
          updated_at: new Date().toISOString()
        })
        .eq('channel_id', 'world-knowledge')
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '채널 프로필이 업데이트되었습니다',
          data
        })
      }
    } else {
      // 없으면 새로 생성
      const { data, error } = await supabase
        .from('channel_profiles')
        .insert({
          channel_id: 'world-knowledge',
          channel_name: WorldKnowledgeProfile.channelInfo.name,
          profile_data: WorldKnowledgeProfile,
          customizations: {},
          analytics: {
            total_videos: 0,
            total_views: 0,
            average_rating: 0,
            last_updated: new Date().toISOString()
          },
          is_active: true
        })
        .select()
        .single()

      if (error) throw error

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: '채널 프로필이 생성되었습니다',
          data
        })
      }
    }
  } catch (error) {
    console.error('채널 프로필 초기화 오류:', error)
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: '채널 프로필 초기화 실패',
        details: error.message
      })
    }
  }
}