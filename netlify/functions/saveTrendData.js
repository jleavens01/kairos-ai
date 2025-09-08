// 트렌드 데이터를 Supabase에 저장하는 함수
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

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
    // 환경 변수 확인
    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase configuration:', {
        url: !!supabaseUrl,
        key: !!supabaseServiceKey
      });
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Server configuration error: Supabase credentials not found',
          details: {
            hasUrl: !!supabaseUrl,
            hasKey: !!supabaseServiceKey
          }
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

    const trendData = JSON.parse(event.body);

    // 1. 트렌드 수집 세션 생성
    const { data: collection, error: collectionError } = await supabase
      .from('trend_collections')
      .insert({
        user_id: user.id,
        total_youtube_views: trendData.statistics?.totalYoutubeViews || 0,
        total_videos: trendData.statistics?.totalVideos || 0,
        total_naver_items: trendData.statistics?.totalNaverItems || 0,
        status: 'completed'
      })
      .select()
      .single();

    if (collectionError) {
      console.error('Collection insert error:', collectionError);
      throw collectionError;
    }

    const collectionId = collection.id;

    // 2. YouTube 동영상 데이터 저장
    if (trendData.youtubeVideos && trendData.youtubeVideos.length > 0) {
      const youtubeData = trendData.youtubeVideos.map((video, index) => ({
        collection_id: collectionId,
        video_id: video.id,
        title: video.title,
        channel: video.channel,
        description: video.description || '',
        tags: video.tags || [],
        view_count: video.viewCount || 0,
        like_count: video.likeCount || 0,
        comment_count: video.commentCount || 0,
        published_at: video.publishedAt,
        category_id: video.categoryId,
        thumbnail_url: video.thumbnail,
        video_url: video.url,
        rank: index + 1
      }));

      const { error: youtubeError } = await supabase
        .from('youtube_trends')
        .upsert(youtubeData, { onConflict: 'video_id' });

      if (youtubeError) {
        console.error('YouTube insert error:', youtubeError);
      }
    }

    // 3. 네이버 쇼핑 트렌드 저장
    if (trendData.naverCategories && trendData.naverCategories.length > 0) {
      const naverData = trendData.naverCategories.map(category => ({
        collection_id: collectionId,
        category: category.category || category.keyword,
        search_volume: category.searchVolume || 0,
        change_rate: category.changeRate || 0,
        trend: category.trend,
        chart_data: category.data || []
      }));

      const { error: naverError } = await supabase
        .from('naver_shopping_trends')
        .insert(naverData);

      if (naverError) {
        console.error('Naver insert error:', naverError);
      }
    }

    // 4. AI 키워드 저장
    if (trendData.keywords && trendData.keywords.length > 0) {
      const keywordData = trendData.keywords.map(keyword => ({
        collection_id: collectionId,
        keyword: keyword.keyword,
        brand: keyword.brand,
        trend: keyword.trend,
        topic: keyword.topic,
        score: keyword.score || 0
      }));

      const { error: keywordError } = await supabase
        .from('ai_keywords')
        .insert(keywordData);

      if (keywordError) {
        console.error('Keyword insert error:', keywordError);
      }
    }

    // 5. 브랜드 데이터도 키워드로 저장
    if (trendData.brands && trendData.brands.length > 0) {
      const brandData = trendData.brands.map(brand => ({
        collection_id: collectionId,
        keyword: brand.brand,
        brand: brand.brand,
        trend: brand.trend,
        topic: brand.topics ? brand.topics.join(', ') : '',
        score: brand.score || 0
      }));

      const { error: brandError } = await supabase
        .from('ai_keywords')
        .insert(brandData);

      if (brandError) {
        console.error('Brand insert error:', brandError);
      }
    }

    // 6. AI 산업별 트렌드 저장
    if (trendData.trends) {
      const industryData = Object.entries(trendData.trends).map(([industry, keywords]) => ({
        collection_id: collectionId,
        industry,
        keywords: keywords || []
      }));

      const { error: industryError } = await supabase
        .from('ai_industry_trends')
        .insert(industryData);

      if (industryError) {
        console.error('Industry trends insert error:', industryError);
      }
    }

    // 7. AI 인사이트 저장
    if (trendData.insights && trendData.insights.length > 0) {
      const insightData = trendData.insights.map(insight => ({
        collection_id: collectionId,
        brand: insight.brand,
        story: insight.story,
        interest: insight.interest
      }));

      const { error: insightError } = await supabase
        .from('ai_insights')
        .insert(insightData);

      if (insightError) {
        console.error('Insights insert error:', insightError);
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        collectionId,
        message: '트렌드 데이터가 성공적으로 저장되었습니다.'
      })
    };

  } catch (error) {
    console.error('Save trend data error:', error);
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