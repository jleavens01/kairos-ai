// generated-images 버킷 생성 함수
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
    console.log('Creating generated-images bucket...')
    
    const { data, error } = await supabase.storage
      .createBucket('generated-images', {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50MB
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/gif']
      })

    if (error && !error.message.includes('already exists')) {
      throw new Error(`Bucket creation failed: ${error.message}`)
    }

    const bucketExists = data || error.message.includes('already exists')
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        message: bucketExists ? 'Bucket already exists' : 'Bucket created successfully',
        bucketData: data
      })
    }

  } catch (error) {
    console.error('Bucket creation error:', error)
    
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