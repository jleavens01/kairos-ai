// 저장된 트렌드 데이터를 가져오는 함수
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

export const handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'GET, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    // 환경 변수 확인
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration');
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error'
        })
      };
    }

    const { authorization } = event.headers;
    if (!authorization) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Authorization required' })
      };
    }

    // Supabase 클라이언트 생성
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 사용자 인증 토큰으로 사용자 정보 가져오기
    const token = authorization.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'Invalid authorization token' })
      };
    }

    // 가장 최근 트렌드 수집 데이터 가져오기
    const { data: collection, error: collectionError } = await supabase
      .from('trend_collections')
      .select('*')
      .eq('user_id', user.id)
      .order('collected_at', { ascending: false })
      .limit(1)
      .single();

    if (collectionError || !collection) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ 
          success: true,
          data: null,
          message: '저장된 트렌드 데이터가 없습니다.'
        })
      };
    }

    const collectionId = collection.id;

    // YouTube 동영상 데이터 가져오기
    const { data: youtubeVideos, error: youtubeError } = await supabase
      .from('youtube_trends')
      .select('*')
      .eq('collection_id', collectionId)
      .order('rank', { ascending: true });

    if (youtubeError) {
      console.error('YouTube data fetch error:', youtubeError);
    }

    // 네이버 쇼핑 트렌드 가져오기
    const { data: naverCategories, error: naverError } = await supabase
      .from('naver_shopping_trends')
      .select('*')
      .eq('collection_id', collectionId);

    if (naverError) {
      console.error('Naver data fetch error:', naverError);
    }

    // AI 키워드 가져오기
    const { data: keywords, error: keywordError } = await supabase
      .from('ai_keywords')
      .select('*')
      .eq('collection_id', collectionId)
      .order('score', { ascending: false });

    if (keywordError) {
      console.error('Keywords fetch error:', keywordError);
    }

    // 브랜드별로 그룹화
    const brandMap = {};
    if (keywords) {
      keywords.forEach(keyword => {
        if (keyword.brand) {
          if (!brandMap[keyword.brand]) {
            brandMap[keyword.brand] = {
              brand: keyword.brand,
              trend: keyword.trend,
              topics: [],
              score: keyword.score,
              count: 0
            };
          }
          if (keyword.topic) {
            brandMap[keyword.brand].topics.push(keyword.topic);
          }
          brandMap[keyword.brand].count++;
        }
      });
    }
    const brands = Object.values(brandMap).sort((a, b) => b.score - a.score);

    // AI 산업별 트렌드 가져오기
    const { data: industryTrends, error: industryError } = await supabase
      .from('ai_industry_trends')
      .select('*')
      .eq('collection_id', collectionId);

    if (industryError) {
      console.error('Industry trends fetch error:', industryError);
    }

    // 산업별 트렌드를 객체 형태로 변환
    const trends = {};
    if (industryTrends) {
      industryTrends.forEach(item => {
        trends[item.industry] = item.keywords || [];
      });
    }

    // AI 인사이트 가져오기
    const { data: insights, error: insightError } = await supabase
      .from('ai_insights')
      .select('*')
      .eq('collection_id', collectionId);

    if (insightError) {
      console.error('Insights fetch error:', insightError);
    }

    // 응답 데이터 구성
    const responseData = {
      timestamp: collection.collected_at,
      keywords: keywords || [],
      brands: brands,
      trends: trends,
      insights: insights || [],
      topContent: {
        youtube: youtubeVideos ? youtubeVideos.slice(0, 5) : [],
        naver: naverCategories ? naverCategories.slice(0, 5) : []
      },
      youtubeVideos: youtubeVideos ? youtubeVideos.map(video => ({
        id: video.video_id,
        title: video.title,
        channel: video.channel,
        thumbnail: video.thumbnail_url,
        viewCount: video.view_count,
        likeCount: video.like_count,
        url: video.video_url,
        publishedAt: video.published_at
      })) : [],
      naverCategories: naverCategories || [],
      statistics: {
        totalYoutubeViews: collection.total_youtube_views || 0,
        totalVideos: collection.total_videos || 0,
        totalNaverItems: collection.total_naver_items || 0
      }
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        data: responseData,
        collectionId: collectionId,
        collectedAt: collection.collected_at
      })
    };

  } catch (error) {
    console.error('Get trend data error:', error);
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