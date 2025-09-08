// Google Drive 동기화 함수
import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Google Drive 인증 설정
const auth = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

// 저장된 토큰 사용
auth.setCredentials({
  refresh_token: process.env.GOOGLE_REFRESH_TOKEN
});

const drive = google.drive({ version: 'v3', auth });

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { action, folderId } = JSON.parse(event.body || '{}');
    
    switch (action) {
      case 'list':
        return await listFiles(folderId);
        
      case 'download':
        return await downloadFile(folderId);
        
      case 'sync':
        return await syncToDatabase(folderId);
        
      default:
        throw new Error('Invalid action');
    }
    
  } catch (error) {
    console.error('Google Drive 동기화 실패:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        success: false,
        error: error.message
      })
    };
  }
};

// Google Drive 파일 목록 가져오기
async function listFiles(folderId) {
  const query = folderId 
    ? `'${folderId}' in parents and mimeType = 'text/plain'`
    : "mimeType = 'text/plain' and name contains '세모지'";
    
  const response = await drive.files.list({
    q: query,
    fields: 'files(id, name, mimeType, modifiedTime, size)',
    orderBy: 'modifiedTime desc'
  });
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      files: response.data.files
    })
  };
}

// 파일 다운로드 및 파싱
async function downloadFile(fileId) {
  // 파일 메타데이터 가져오기
  const file = await drive.files.get({
    fileId: fileId,
    fields: 'name'
  });
  
  // 파일 내용 다운로드
  const response = await drive.files.get({
    fileId: fileId,
    alt: 'media'
  }, {
    responseType: 'text'
  });
  
  const content = response.data;
  const parsed = parseScriptContent(content, file.data.name);
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      script: parsed
    })
  };
}

// 폴더 내 모든 파일 동기화
async function syncToDatabase(folderId) {
  // 폴더 내 모든 텍스트 파일 가져오기
  const response = await drive.files.list({
    q: `'${folderId}' in parents and mimeType = 'text/plain'`,
    fields: 'files(id, name, mimeType, modifiedTime)',
    pageSize: 100
  });
  
  const files = response.data.files;
  const results = [];
  
  for (const file of files) {
    try {
      // 파일 내용 다운로드
      const content = await drive.files.get({
        fileId: file.id,
        alt: 'media'
      }, {
        responseType: 'text'
      });
      
      // 파싱
      const parsed = parseScriptContent(content.data, file.name);
      
      // 데이터베이스에 저장
      const { data, error } = await supabaseAdmin
        .from('semoji_training_data')
        .upsert({
          title: parsed.title,
          topic: parsed.topic,
          video_id: parsed.videoId,
          intro: parsed.intro,
          full_script: parsed.full_script,
          keywords: parsed.keywords,
          intro_type: parsed.introType,
          duration_minutes: parsed.duration,
          source: 'google_drive',
          quality_score: 70,
          is_verified: false
        }, {
          onConflict: 'title'
        });
      
      if (!error) {
        results.push({
          name: file.name,
          status: 'success'
        });
      } else {
        results.push({
          name: file.name,
          status: 'error',
          error: error.message
        });
      }
      
    } catch (error) {
      results.push({
        name: file.name,
        status: 'error',
        error: error.message
      });
    }
  }
  
  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      success: true,
      synced: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'error').length,
      details: results
    })
  };
}

// 원고 내용 파싱
function parseScriptContent(text, filename) {
  const lines = text.split('\n');
  let title = '';
  let topic = '';
  let videoId = '';
  let duration = 15;
  let intro = '';
  
  // 메타데이터 파싱
  lines.forEach((line) => {
    if (line.startsWith('제목:')) {
      title = line.replace('제목:', '').trim();
    } else if (line.startsWith('주제:')) {
      topic = line.replace('주제:', '').trim();
    } else if (line.startsWith('YouTube ID:')) {
      videoId = line.replace('YouTube ID:', '').trim();
    } else if (line.includes('예상 시간')) {
      const match = line.match(/(\d+)분/);
      if (match) duration = parseInt(match[1]);
    }
  });
  
  // 제목이 없으면 파일명에서 추출
  if (!title) {
    title = filename.replace(/\.(txt|md)$/, '').replace(/_/g, ' ');
  }
  
  // 도입부 추출
  const openingIndex = lines.findIndex(line => line.includes('오프닝'));
  if (openingIndex !== -1) {
    intro = lines.slice(openingIndex + 1, openingIndex + 6)
      .filter(line => line.trim())
      .join(' ')
      .replace(/#\d+_/g, '');
  }
  
  // 키워드 추출
  const words = text.match(/[가-힣]+/g) || [];
  const wordCount = {};
  words.forEach(word => {
    if (word.length >= 2) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });
  
  const keywords = Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);
  
  return {
    title,
    topic,
    videoId,
    intro,
    full_script: text,
    keywords,
    introType: detectIntroType(intro),
    duration
  };
}

function detectIntroType(intro) {
  if (!intro) return '일반';
  if (intro.includes('?')) return '질문';
  if (intro.match(/\d{4}년/)) return '시간 대비';
  if (intro.match(/\d+[%명개]/)) return '통계';
  if (intro.includes('여러분')) return '일상 연결';
  return '일반';
}