-- content_items 테이블에 AI 분석 관련 컬럼 추가

-- AI 분석 관련 컬럼들 추가
ALTER TABLE content_items 
ADD COLUMN IF NOT EXISTS ai_analyzed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS ai_model VARCHAR(100),
ADD COLUMN IF NOT EXISTS ai_analysis JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS base_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ai_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS final_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS analyzed_at TIMESTAMPTZ;

-- AI 분석 데이터 구조 설명
COMMENT ON COLUMN content_items.ai_analyzed IS 'AI 분석 완료 여부';
COMMENT ON COLUMN content_items.ai_model IS '사용된 AI 모델 (gemini-2.0-flash, gpt-4 등)';
COMMENT ON COLUMN content_items.ai_analysis IS 'AI 분석 결과 JSON - {detectedBrands, relatedBrands, storyAngles, hiddenFacts, contentIdeas, trendRelevance, brandEncyclopediaFit}';
COMMENT ON COLUMN content_items.base_score IS '기본 키워드 매칭 점수';
COMMENT ON COLUMN content_items.ai_score IS 'AI 분석 점수';
COMMENT ON COLUMN content_items.final_score IS '최종 종합 점수 (base_score * 0.3 + ai_score * 0.7)';
COMMENT ON COLUMN content_items.analyzed_at IS 'AI 분석 완료 시간';

-- 기존 score 컬럼을 final_score로 마이그레이션 (기존 데이터가 있다면)
UPDATE content_items 
SET final_score = score 
WHERE score IS NOT NULL AND score > 0 AND final_score = 0;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_content_items_ai_analyzed ON content_items(ai_analyzed);
CREATE INDEX IF NOT EXISTS idx_content_items_final_score ON content_items(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_content_items_analyzed_at ON content_items(analyzed_at DESC);

-- AI 분석 결과를 쉽게 조회할 수 있는 뷰 생성
CREATE OR REPLACE VIEW content_items_ai_view AS
SELECT 
    id,
    title,
    summary,
    source_url,
    category,
    thumbnail_url,
    status,
    workflow_stage,
    
    -- 점수 관련
    base_score,
    ai_score,
    final_score,
    COALESCE(final_score, score, 0) as display_score,
    suitability,
    
    -- AI 분석 관련
    ai_analyzed,
    ai_model,
    analyzed_at,
    
    -- AI 분석 결과 JSON 필드들을 개별 컬럼으로 추출
    ai_analysis->>'detectedBrands' as detected_brands,
    ai_analysis->>'relatedBrands' as related_brands,
    ai_analysis->>'storyAngles' as story_angles,
    ai_analysis->>'hiddenFacts' as hidden_facts,
    ai_analysis->>'contentIdeas' as content_ideas,
    ai_analysis->>'trendRelevance' as trend_relevance,
    ai_analysis->>'brandEncyclopediaFit' as brand_encyclopedia_fit,
    
    -- 메타데이터
    metadata,
    created_at,
    updated_at
FROM content_items
ORDER BY created_at DESC;

-- 권한 설정
GRANT SELECT ON content_items_ai_view TO anon, authenticated, service_role;