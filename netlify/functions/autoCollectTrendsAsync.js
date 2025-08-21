// 비동기 트렌드 수집 시작 함수
// 즉시 작업 ID를 반환하고 백그라운드에서 처리

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const GEMINI_API_KEY = process.env.GENERATIVE_LANGUAGE_API_KEY || process.env.GOOGLE_API_KEY;
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY || process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { projectId } = JSON.parse(event.body);
    
    // Supabase 클라이언트 초기화
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    // 작업 ID 생성
    const jobId = `trend_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // 작업 상태를 DB에 저장
    const { data: job, error: jobError } = await supabase
      .from('trend_jobs')
      .insert({
        id: jobId,
        project_id: projectId,
        status: 'pending',
        created_at: new Date().toISOString(),
        metadata: {
          source: 'auto_collect',
          apis: ['youtube', 'naver']
        }
      })
      .select()
      .single();
    
    if (jobError) {
      // trend_jobs 테이블이 없으면 projects 테이블의 metadata 사용
      console.log('trend_jobs 테이블이 없습니다. metadata 사용');
      
      // 백그라운드 처리 시작 (Promise를 기다리지 않음)
      processInBackground(jobId, projectId);
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          success: true,
          jobId,
          message: '트렌드 수집이 시작되었습니다. 잠시 후 결과를 확인하세요.',
          estimatedTime: '약 30-60초'
        })
      };
    }
    
    // 백그라운드 처리 시작 (Promise를 기다리지 않음)
    processInBackground(jobId, projectId);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        jobId,
        message: '트렌드 수집이 시작되었습니다. 잠시 후 결과를 확인하세요.',
        estimatedTime: '약 30-60초'
      })
    };
    
  } catch (error) {
    console.error('작업 시작 실패:', error);
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

// 백그라운드 처리 함수
async function processInBackground(jobId, projectId) {
  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  
  try {
    console.log(`백그라운드 트렌드 수집 시작: ${jobId}`);
    
    // 상태 업데이트: processing
    await updateJobStatus(supabase, jobId, 'processing', { startedAt: new Date().toISOString() });
    
    // 1. YouTube 인기 동영상 수집
    const youtubeVideos = await collectYouTubeTrending();
    console.log(`YouTube 동영상 ${youtubeVideos.length}개 수집 완료`);
    
    // 2. 네이버 쇼핑인사이트 수집
    const naverTrends = await collectNaverTrends();
    console.log(`네이버 쇼핑 트렌드 ${naverTrends.length}개 수집 완료`);
    
    // 3. AI 분석으로 핵심 키워드 도출
    const aiAnalysis = await analyzeWithAI({
      youtube: youtubeVideos,
      naver: naverTrends
    });
    
    // 4. 브랜드별로 그룹화
    const brandGroups = groupByBrands(aiAnalysis.keywords);
    
    const result = {
      timestamp: new Date().toISOString(),
      keywords: aiAnalysis.keywords,
      brands: brandGroups,
      trends: aiAnalysis.trends,
      insights: aiAnalysis.insights,
      topContent: {
        youtube: youtubeVideos.slice(0, 5),
        naver: naverTrends.slice(0, 5)
      },
      youtubeVideos: youtubeVideos.map(video => ({
        id: video.id,
        title: video.title,
        channel: video.channel,
        thumbnail: video.thumbnail,
        viewCount: video.viewCount,
        likeCount: video.likeCount,
        url: `https://www.youtube.com/watch?v=${video.id}`,
        publishedAt: video.publishedAt
      })),
      naverCategories: naverTrends,
      statistics: {
        totalYoutubeViews: youtubeVideos.reduce((sum, v) => sum + v.viewCount, 0),
        totalVideos: youtubeVideos.length,
        totalNaverItems: naverTrends.length
      }
    };
    
    // 결과를 프로젝트 metadata에 저장
    const { error: updateError } = await supabase
      .from('projects')
      .update({
        metadata: {
          lastTrendAnalysis: result,
          lastTrendJobId: jobId,
          lastTrendUpdate: new Date().toISOString()
        }
      })
      .eq('id', projectId);
    
    if (updateError) {
      throw updateError;
    }
    
    // 상태 업데이트: completed
    await updateJobStatus(supabase, jobId, 'completed', {
      completedAt: new Date().toISOString(),
      resultSummary: {
        keywordsCount: aiAnalysis.keywords.length,
        videosCount: youtubeVideos.length,
        categoriesCount: naverTrends.length
      }
    });
    
    console.log(`트렌드 수집 완료: ${jobId}`);
    
  } catch (error) {
    console.error(`트렌드 수집 실패: ${jobId}`, error);
    
    // 상태 업데이트: failed
    await updateJobStatus(supabase, jobId, 'failed', {
      failedAt: new Date().toISOString(),
      error: error.message
    });
  }
}

// 작업 상태 업데이트 함수
async function updateJobStatus(supabase, jobId, status, metadata = {}) {
  try {
    // trend_jobs 테이블 업데이트 시도
    const { error } = await supabase
      .from('trend_jobs')
      .update({
        status,
        metadata: { ...metadata }
      })
      .eq('id', jobId);
    
    if (error) {
      console.log('trend_jobs 테이블 업데이트 실패, 스킵:', error.message);
    }
  } catch (error) {
    console.log('상태 업데이트 스킵:', error.message);
  }
}

// YouTube 인기 동영상 수집
async function collectYouTubeTrending() {
  if (!YOUTUBE_API_KEY) {
    console.error('YouTube API 키가 설정되지 않았습니다.');
    return [];
  }
  
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=KR&maxResults=50&key=${YOUTUBE_API_KEY}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error('YouTube API 오류:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      return [];
    }
    
    return data.items.map(video => ({
      id: video.id,
      title: video.snippet.title,
      channel: video.snippet.channelTitle,
      thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
      viewCount: parseInt(video.statistics?.viewCount || 0),
      likeCount: parseInt(video.statistics?.likeCount || 0),
      publishedAt: video.snippet.publishedAt,
      tags: video.snippet.tags || []
    }));
    
  } catch (error) {
    console.error('YouTube API 호출 실패:', error);
    return [];
  }
}

// 네이버 쇼핑인사이트 수집
async function collectNaverTrends() {
  if (!NAVER_CLIENT_ID || !NAVER_CLIENT_SECRET) {
    console.error('네이버 API 키가 설정되지 않았습니다.');
    return [];
  }
  
  const categories = [
    { name: '패션의류', code: '50000000' },
    { name: '화장품/미용', code: '50000002' },
    { name: '디지털/가전', code: '50000003' }
  ];
  
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);
  
  const requestBody = {
    startDate: startDate.toISOString().split('T')[0],
    endDate: endDate.toISOString().split('T')[0],
    timeUnit: 'date',
    category: categories.map(cat => ({
      name: cat.name,
      param: [cat.code]
    }))
  };
  
  try {
    const response = await fetch('https://openapi.naver.com/v1/datalab/shopping/categories', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Naver-Client-Id': NAVER_CLIENT_ID,
        'X-Naver-Client-Secret': NAVER_CLIENT_SECRET
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      console.error('네이버 API 오류:', response.status);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.results || data.results.length === 0) {
      return [];
    }
    
    return data.results.map(result => ({
      category: result.title,
      data: result.data,
      trend: calculateTrend(result.data)
    }));
    
  } catch (error) {
    console.error('네이버 API 호출 실패:', error);
    return [];
  }
}

// 트렌드 계산
function calculateTrend(data) {
  if (!data || data.length < 2) return 'stable';
  
  const recent = data.slice(-3).reduce((sum, d) => sum + d.ratio, 0) / 3;
  const previous = data.slice(-6, -3).reduce((sum, d) => sum + d.ratio, 0) / 3;
  
  const change = ((recent - previous) / previous) * 100;
  
  if (change > 20) return 'rising';
  if (change < -20) return 'falling';
  return 'stable';
}

// AI 분석
async function analyzeWithAI(collectedData) {
  if (!GEMINI_API_KEY) {
    console.error('Gemini API 키가 설정되지 않았습니다.');
    return {
      keywords: [],
      trends: [],
      insights: []
    };
  }
  
  const prompt = `
다음 트렌드 데이터를 분석하여 핵심 키워드와 인사이트를 추출해주세요.

YouTube 인기 동영상 (상위 10개):
${collectedData.youtube.slice(0, 10).map(v => `- ${v.title} (조회수: ${v.viewCount.toLocaleString()})`).join('\n')}

네이버 쇼핑 카테고리 트렌드:
${collectedData.naver.map(n => `- ${n.category}: ${n.trend}`).join('\n')}

다음 JSON 형식으로 응답해주세요:
{
  "keywords": [
    {"keyword": "키워드", "brand": "브랜드명 또는 null", "trend": "rising/stable/falling", "topic": "카테고리"}
  ],
  "trends": ["주요 트렌드 설명"],
  "insights": ["인사이트 및 추천사항"]
}
`;
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }],
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2000,
          responseMimeType: "application/json"
        }
      })
    });
    
    if (!response.ok) {
      console.error('Gemini API 오류:', response.status);
      return {
        keywords: [],
        trends: [],
        insights: []
      };
    }
    
    const data = await response.json();
    const result = JSON.parse(data.candidates[0].content.parts[0].text);
    
    return result;
    
  } catch (error) {
    console.error('AI 분석 실패:', error);
    return {
      keywords: [],
      trends: [],
      insights: []
    };
  }
}

// 브랜드별 그룹화
function groupByBrands(keywords) {
  const brands = {};
  
  keywords.forEach(kw => {
    const brand = kw.brand || 'general';
    if (!brands[brand]) {
      brands[brand] = [];
    }
    brands[brand].push(kw);
  });
  
  return brands;
}