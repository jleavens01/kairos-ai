// Storage 접근 테스트 함수
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export const handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Content-Type': 'application/json'
  }

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' }
  }

  try {
    console.log('Storage 접근 테스트 시작...')
    
    // 1. 버킷 목록 조회
    const { data: buckets, error: listError } = await supabase.storage.listBuckets()
    
    if (listError) {
      throw new Error(`Bucket list failed: ${listError.message}`)
    }
    
    console.log('Available buckets:', buckets?.map(b => b.name))
    
    // 2. gen-images 버킷의 파일들 조회
    const { data: files, error: filesError } = await supabase.storage
      .from('gen-images')
      .list('', { limit: 5 })
    
    if (filesError) {
      throw new Error(`File list failed: ${filesError.message}`)
    }
    
    // 3. 간단한 텍스트 파일 업로드 테스트
    const testFileName = `test_${Date.now()}.txt`
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('gen-images')
      .upload(testFileName, 'test content', {
        contentType: 'text/plain'
      })
    
    let uploadResult = null
    if (!uploadError) {
      uploadResult = 'Upload successful'
      // 테스트 파일 삭제
      await supabase.storage.from('gen-images').remove([testFileName])
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        buckets: buckets?.map(b => ({ name: b.name, public: b.public })),
        fileCount: files?.length || 0,
        uploadTest: uploadResult || uploadError?.message,
        sampleFiles: files?.slice(0, 3).map(f => f.name) || []
      })
    }

  } catch (error) {
    console.error('Storage 테스트 오류:', error)
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      })
    }
  }
}