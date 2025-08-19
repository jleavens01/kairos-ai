-- 트렌드 분석 테이블 생성 마이그레이션
-- 실행 방법: Supabase SQL Editor에서 실행

-- 기존 테이블이 있다면 삭제 (주의: 데이터가 삭제됩니다)
-- DROP TABLE IF EXISTS ai_insights CASCADE;
-- DROP TABLE IF EXISTS ai_industry_trends CASCADE;
-- DROP TABLE IF EXISTS ai_keywords CASCADE;
-- DROP TABLE IF EXISTS naver_shopping_trends CASCADE;
-- DROP TABLE IF EXISTS youtube_trends CASCADE;
-- DROP TABLE IF EXISTS trend_collections CASCADE;

-- 1. 트렌드 수집 세션 테이블
CREATE TABLE IF NOT EXISTS trend_collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  collected_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 통계 정보
  total_youtube_views BIGINT DEFAULT 0,
  total_videos INTEGER DEFAULT 0,
  total_naver_items INTEGER DEFAULT 0,
  
  -- 상태
  status VARCHAR(50) DEFAULT 'completed',
  error_message TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. YouTube 동영상 데이터
CREATE TABLE IF NOT EXISTS youtube_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES trend_collections(id) ON DELETE CASCADE,
  
  -- YouTube 메타데이터
  video_id VARCHAR(255) NOT NULL,
  title TEXT NOT NULL,
  channel VARCHAR(255),
  description TEXT,
  tags TEXT[],
  view_count BIGINT DEFAULT 0,
  like_count BIGINT DEFAULT 0,
  comment_count BIGINT DEFAULT 0,
  published_at TIMESTAMPTZ,
  category_id VARCHAR(50),
  thumbnail_url TEXT,
  video_url TEXT,
  
  -- 순위
  rank INTEGER,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- 동일한 비디오는 collection_id 별로 하나만
  UNIQUE(collection_id, video_id)
);

-- 3. 네이버 쇼핑 트렌드
CREATE TABLE IF NOT EXISTS naver_shopping_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES trend_collections(id) ON DELETE CASCADE,
  
  -- 쇼핑 트렌드 데이터
  category VARCHAR(255) NOT NULL,
  search_volume INTEGER DEFAULT 0,
  change_rate DECIMAL(10, 2),
  trend VARCHAR(50),
  
  -- 차트 데이터 (7일간)
  chart_data JSONB,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. AI 분석 키워드
CREATE TABLE IF NOT EXISTS ai_keywords (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES trend_collections(id) ON DELETE CASCADE,
  
  -- 키워드 정보
  keyword VARCHAR(255) NOT NULL,
  brand VARCHAR(255),
  trend VARCHAR(50),
  topic VARCHAR(255),
  score INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. AI 산업별 트렌드
CREATE TABLE IF NOT EXISTS ai_industry_trends (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES trend_collections(id) ON DELETE CASCADE,
  
  -- 산업별 트렌드
  industry VARCHAR(50) NOT NULL,
  keywords TEXT[],
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. AI 인사이트
CREATE TABLE IF NOT EXISTS ai_insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES trend_collections(id) ON DELETE CASCADE,
  
  -- 인사이트 정보
  brand VARCHAR(255),
  story TEXT,
  interest VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_trend_collections_user_id ON trend_collections(user_id);
CREATE INDEX IF NOT EXISTS idx_trend_collections_collected_at ON trend_collections(collected_at DESC);
CREATE INDEX IF NOT EXISTS idx_youtube_trends_collection_id ON youtube_trends(collection_id);
CREATE INDEX IF NOT EXISTS idx_youtube_trends_video_id ON youtube_trends(video_id);
CREATE INDEX IF NOT EXISTS idx_naver_shopping_trends_collection_id ON naver_shopping_trends(collection_id);
CREATE INDEX IF NOT EXISTS idx_ai_keywords_collection_id ON ai_keywords(collection_id);
CREATE INDEX IF NOT EXISTS idx_ai_industry_trends_collection_id ON ai_industry_trends(collection_id);
CREATE INDEX IF NOT EXISTS idx_ai_insights_collection_id ON ai_insights(collection_id);

-- RLS 정책 활성화
ALTER TABLE trend_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE naver_shopping_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_industry_trends ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_insights ENABLE ROW LEVEL SECURITY;

-- RLS 정책 생성 (기존 정책이 있으면 삭제 후 재생성)
DROP POLICY IF EXISTS "Users can manage own trend collections" ON trend_collections;
CREATE POLICY "Users can manage own trend collections" ON trend_collections
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view own youtube trends" ON youtube_trends;
CREATE POLICY "Users can view own youtube trends" ON youtube_trends
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trend_collections 
      WHERE trend_collections.id = youtube_trends.collection_id 
      AND trend_collections.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own naver trends" ON naver_shopping_trends;
CREATE POLICY "Users can view own naver trends" ON naver_shopping_trends
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trend_collections 
      WHERE trend_collections.id = naver_shopping_trends.collection_id 
      AND trend_collections.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own ai keywords" ON ai_keywords;
CREATE POLICY "Users can view own ai keywords" ON ai_keywords
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trend_collections 
      WHERE trend_collections.id = ai_keywords.collection_id 
      AND trend_collections.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own ai industry trends" ON ai_industry_trends;
CREATE POLICY "Users can view own ai industry trends" ON ai_industry_trends
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trend_collections 
      WHERE trend_collections.id = ai_industry_trends.collection_id 
      AND trend_collections.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can view own ai insights" ON ai_insights;
CREATE POLICY "Users can view own ai insights" ON ai_insights
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM trend_collections 
      WHERE trend_collections.id = ai_insights.collection_id 
      AND trend_collections.user_id = auth.uid()
    )
  );

-- 트리거 함수: updated_at 자동 업데이트
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_trend_collections_updated_at ON trend_collections;
CREATE TRIGGER update_trend_collections_updated_at
  BEFORE UPDATE ON trend_collections
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();