// HeyGen 비디오 Supabase Storage 백업 함수
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  // CORS 헤더 설정
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    }
  }

  try {
    const { heygen_video_id, force_rebackup = false } = JSON.parse(event.body)

    if (!heygen_video_id) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'heygen_video_id is required' })
      }
    }

    console.log(`🎬 Starting backup for HeyGen video: ${heygen_video_id}`)

    // 데이터베이스에서 비디오 정보 조회
    const { data: videoRecord, error: fetchError } = await supabase
      .from('gen_heygen_videos')
      .select('*')
      .eq('heygen_video_id', heygen_video_id)
      .eq('status', 'completed')
      .single()

    if (fetchError || !videoRecord) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({
          error: 'HeyGen video not found or not completed',
          heygen_video_id
        })
      }
    }

    // 이미 백업된 경우 체크
    if (videoRecord.backup_status === 'completed' && !force_rebackup) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          message: 'Video already backed up',
          heygen_video_id,
          backup_url: videoRecord.backup_storage_url,
          skipped: true
        })
      }
    }

    if (!videoRecord.video_url) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({
          error: 'No video URL found for backup',
          heygen_video_id
        })
      }
    }

    // 백업 시작 - 상태를 pending으로 설정
    await supabase
      .from('gen_heygen_videos')
      .update({ 
        backup_status: 'pending',
        updated_at: new Date().toISOString()
      })
      .eq('id', videoRecord.id)

    console.log(`📥 Downloading HeyGen video from: ${videoRecord.video_url}`)

    // HeyGen에서 비디오 다운로드
    const downloadResponse = await fetch(videoRecord.video_url)
    
    if (!downloadResponse.ok) {
      throw new Error(`Failed to download video: ${downloadResponse.status}`)
    }

    // 파일 데이터를 Uint8Array로 변환
    const arrayBuffer = await downloadResponse.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)
    const actualFileSize = uint8Array.length

    console.log(`📏 Downloaded file size: ${(actualFileSize / 1024 / 1024).toFixed(2)} MB`)

    // 파일명 생성 (HeyGen 비디오 ID 기반)
    const fileName = `heygen_${heygen_video_id}.mp4`
    const storagePath = `heygen_videos/${fileName}`

    // Content-Type은 MP4로 고정 (HeyGen은 MP4만 제공)
    const contentType = 'video/mp4'

    console.log(`📤 Uploading to Supabase Storage: ${storagePath}`)

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('backups')
      .upload(storagePath, uint8Array, {
        contentType,
        upsert: force_rebackup // 재백업인 경우 덮어쓰기 허용
      })

    if (uploadError) {
      console.error('❌ Upload error:', uploadError)
      
      // 백업 실패 상태로 업데이트
      await supabase
        .from('gen_heygen_videos')
        .update({
          backup_status: 'failed',
          updated_at: new Date().toISOString()
        })
        .eq('id', videoRecord.id)

      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Upload failed',
          details: uploadError.message,
          heygen_video_id
        })
      }
    }

    // 백업된 파일의 공개 URL 생성
    const { data: urlData } = supabase.storage
      .from('backups')
      .getPublicUrl(storagePath)

    const backupUrl = urlData.publicUrl

    console.log(`✅ Upload successful: ${backupUrl}`)

    // 데이터베이스에 백업 정보 업데이트
    const { error: updateError } = await supabase
      .from('gen_heygen_videos')
      .update({
        backup_storage_url: backupUrl,
        
        backed_up_at: new Date().toISOString(),
        backup_status: 'completed',
        backup_file_size: actualFileSize,
        file_size: videoRecord.file_size || actualFileSize, // 원본 파일 크기도 업데이트
        updated_at: new Date().toISOString()
      })
      .eq('id', videoRecord.id)

    if (updateError) {
      console.error('⚠️ Database update error:', updateError)
      // 업로드는 성공했지만 DB 업데이트 실패
    }

    const response = {
      success: true,
      heygen_video_id,
      backup_url: backupUrl,
      backup_path: storagePath,
      file_size: actualFileSize,
      file_size_mb: Math.round(actualFileSize / 1024 / 1024 * 100) / 100,
      message: 'HeyGen video backed up successfully'
    }

    console.log('🎉 HeyGen video backup completed:', response)

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    }

  } catch (error) {
    console.error('❌ HeyGen video backup error:', error)

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Backup failed',
        message: error.message
      })
    }
  }
}

// HeyGen 비디오 대량 백업 함수
export async function backupHeyGenVideosBatch(limit = 10) {
  try {
    console.log(`🎬 Starting batch backup for HeyGen videos (limit: ${limit})`)

    // 백업이 필요한 완료된 HeyGen 비디오들 조회
    const { data: videos, error } = await supabase
      .from('gen_heygen_videos')
      .select('*')
      .eq('status', 'completed')
      .is('backup_status', null)
      .not('video_url', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Failed to fetch HeyGen videos for backup:', error)
      return { success: false, error: error.message }
    }

    if (!videos || videos.length === 0) {
      console.log('No HeyGen videos found for backup')
      return { success: true, processed: 0, message: 'No videos to backup' }
    }

    console.log(`Found ${videos.length} HeyGen videos for backup`)

    const results = []
    for (const video of videos) {
      try {
        // 개별 비디오 백업
        const event = {
          httpMethod: 'POST',
          body: JSON.stringify({ heygen_video_id: video.heygen_video_id })
        }

        const result = await handler(event)
        const response = JSON.parse(result.body)
        
        results.push({
          heygen_video_id: video.heygen_video_id,
          success: result.statusCode === 200,
          ...response
        })

        // API 부하 방지를 위한 지연
        await new Promise(resolve => setTimeout(resolve, 2000))

      } catch (error) {
        console.error(`Failed to backup HeyGen video ${video.heygen_video_id}:`, error)
        results.push({
          heygen_video_id: video.heygen_video_id,
          success: false,
          error: error.message
        })
      }
    }

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`🎉 HeyGen batch backup completed: ${successful} successful, ${failed} failed`)

    return {
      success: true,
      processed: results.length,
      successful,
      failed,
      results
    }

  } catch (error) {
    console.error('HeyGen batch backup error:', error)
    return { success: false, error: error.message }
  }
}