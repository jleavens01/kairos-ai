-- gen_videos 테이블에 CSV 데이터 임포트를 위한 SQL 스크립트
-- UUID 필드를 자동 생성하여 처리

-- 임시 테이블 생성 (UUID 없이)
CREATE TEMP TABLE temp_gen_videos (
    video_type VARCHAR,
    element_name TEXT,
    description TEXT,
    generation_status VARCHAR,
    generation_model VARCHAR,
    model_parameters JSONB,
    prompt_used TEXT,
    custom_prompt TEXT,
    reference_image_url TEXT,
    reference_video_url TEXT,
    result_video_url TEXT,
    storage_video_url TEXT,
    thumbnail_url TEXT,
    duration_seconds INTEGER,
    fps INTEGER,
    resolution VARCHAR,
    request_id VARCHAR,
    metadata JSONB,
    tags TEXT[],
    is_favorite BOOLEAN,
    style_id UUID,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    negative_prompt TEXT,
    aspect_ratio VARCHAR,
    person_generation VARCHAR,
    camera_movement VARCHAR,
    mode VARCHAR,
    prompt_optimizer BOOLEAN,
    model_version VARCHAR,
    api_request JSONB,
    api_response JSONB,
    credits_used INTEGER,
    video_url TEXT,
    linked_scene_id UUID,
    linked_scene_number INTEGER
);

-- CSV 데이터를 임시 테이블로 복사 (psql 명령어)
-- \copy temp_gen_videos FROM '/mnt/c/jleavens/semoji_auto/kairos-ai/gen_videos_rows.csv' WITH CSV HEADER

-- 또는 웹 인터페이스를 통한 임포트를 위해 INSERT 문으로 변환
-- 아래는 샘플 데이터 몇 개를 INSERT 문으로 변환한 예시입니다.

-- 특정 프로젝트와 사용자 UUID 설정
DO $$
DECLARE
    default_project_id UUID := '4e3a9b40-cef2-4579-953b-86040c9b10ee'; -- 프로젝트 ID
    default_user_id UUID := '4a321b3e-e3bd-4368-bd4e-d9cbefc1e79f'; -- 사용자 ID
BEGIN
    -- gen_videos 테이블에 데이터 삽입
    INSERT INTO gen_videos (
        id,
        project_id,
        video_type,
        element_name,
        generation_status,
        generation_model,
        prompt_used,
        custom_prompt,
        reference_image_url,
        result_video_url,
        duration_seconds,
        fps,
        resolution,
        request_id,
        is_favorite,
        created_at,
        updated_at,
        completed_at,
        created_by,
        prompt_optimizer,
        model_version
    )
    VALUES
    -- 첫 번째 비디오
    (
        gen_random_uuid(),
        default_project_id,
        'scene',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Humming. Silence',
        'completed',
        'wan v2.2-a14b',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Humming. Silence',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Humming. Silence',
        'https://v3.fal.media/files/panda/vVsba_qSpFPTZIuqrzhfL_fa4e96bc50e847aaab3bbb06e666f1b4.png',
        'https://v3.fal.media/files/koala/FYi1OgkLGsE-1XDM_6wrz_output.mp4',
        16,
        NULL,
        NULL,
        '743a1aff-9e8e-447a-9337-83e74fe2a4de',
        FALSE,
        '2025-08-09 14:26:09.270586+00'::TIMESTAMPTZ,
        '2025-08-09 15:00:26.613+00'::TIMESTAMPTZ,
        '2025-08-09 14:36:35.859+00'::TIMESTAMPTZ,
        default_user_id,
        NULL,
        'wan v2.2-a14b'
    ),
    -- 두 번째 비디오
    (
        gen_random_uuid(),
        default_project_id,
        'scene',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth.',
        'completed',
        'wan v2.2-a14b',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth.',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth.',
        'https://v3.fal.media/files/panda/vVsba_qSpFPTZIuqrzhfL_fa4e96bc50e847aaab3bbb06e666f1b4.png',
        'https://v3.fal.media/files/panda/I9zys1zeX909WxMAAmaQB_output.mp4',
        16,
        NULL,
        NULL,
        NULL,
        FALSE,
        '2025-08-09 14:26:09.270586+00'::TIMESTAMPTZ,
        '2025-08-09 15:00:26.613+00'::TIMESTAMPTZ,
        '2025-08-09 14:36:35.859+00'::TIMESTAMPTZ,
        default_user_id,
        NULL,
        'wan v2.2-a14b'
    ),
    -- 세 번째 비디오
    (
        gen_random_uuid(),
        default_project_id,
        'scene',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging.',
        'completed',
        'wan v2.2-a14b',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging.',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging.',
        'https://v3.fal.media/files/panda/vVsba_qSpFPTZIuqrzhfL_fa4e96bc50e847aaab3bbb06e666f1b4.png',
        'https://v3.fal.media/files/rabbit/7CMWNxEvwwkVfNM9cM3oH_output.mp4',
        16,
        NULL,
        NULL,
        NULL,
        FALSE,
        '2025-08-09 14:26:09.270586+00'::TIMESTAMPTZ,
        '2025-08-09 15:00:26.613+00'::TIMESTAMPTZ,
        '2025-08-09 14:36:35.859+00'::TIMESTAMPTZ,
        default_user_id,
        NULL,
        'wan v2.2-a14b'
    ),
    -- 네 번째 비디오 (hailou 모델)
    (
        gen_random_uuid(),
        default_project_id,
        'scene',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Humming. Silence',
        'completed',
        'hailou02-standard',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Humming. Silence',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Humming. Silence',
        'https://v3.fal.media/files/panda/vVsba_qSpFPTZIuqrzhfL_fa4e96bc50e847aaab3bbb06e666f1b4.png',
        'https://v3.fal.media/files/tiger/mJijq0EdUGP7ocKjJOCcD_output.mp4',
        NULL,
        NULL,
        NULL,
        NULL,
        FALSE,
        '2025-08-09 14:26:09.270586+00'::TIMESTAMPTZ,
        '2025-08-09 15:00:26.613+00'::TIMESTAMPTZ,
        '2025-08-09 14:36:35.859+00'::TIMESTAMPTZ,
        default_user_id,
        TRUE,
        'hailou02-standard'
    );
END $$;

-- 또는 Python 스크립트를 사용한 방법:
-- 아래 Python 스크립트를 별도 파일로 저장하여 실행

/*
Python 스크립트 예시 (import_videos.py):

import pandas as pd
import psycopg2
from psycopg2.extras import execute_values
import uuid

# CSV 파일 읽기
df = pd.read_csv('/mnt/c/jleavens/semoji_auto/kairos-ai/gen_videos_rows.csv')

# 데이터베이스 연결
conn = psycopg2.connect(
    host="your_host",
    database="your_database",
    user="your_user",
    password="your_password"
)
cur = conn.cursor()

# 기본 UUID 설정
default_project_id = 'YOUR_PROJECT_UUID'  # 실제 프로젝트 ID로 변경
default_user_id = 'YOUR_USER_UUID'  # 실제 사용자 ID로 변경

# 데이터 준비
data = []
for _, row in df.iterrows():
    data.append((
        str(uuid.uuid4()),  # 새 UUID 생성
        default_project_id,
        row['video_type'],
        row['element_name'],
        row['generation_status'],
        row['generation_model'],
        row['prompt_used'],
        row['custom_prompt'],
        row['reference_image_url'],
        row['result_video_url'],
        row['duration_seconds'],
        row['created_at'],
        row['updated_at'],
        row['completed_at'],
        default_user_id,
        row['model_version']
    ))

# 데이터 삽입
insert_query = """
    INSERT INTO gen_videos (
        id, project_id, video_type, element_name, generation_status,
        generation_model, prompt_used, custom_prompt, reference_image_url,
        result_video_url, duration_seconds, created_at, updated_at,
        completed_at, created_by, model_version
    ) VALUES %s
"""

execute_values(cur, insert_query, data)
conn.commit()
cur.close()
conn.close()

print(f"{len(data)}개의 비디오 레코드가 성공적으로 추가되었습니다.")
*/