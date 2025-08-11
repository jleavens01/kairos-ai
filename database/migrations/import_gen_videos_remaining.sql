-- gen_videos 테이블에 나머지 CSV 데이터 추가 (5번째~10번째 데이터)
-- 이미 추가된 4개 외의 나머지 6개 데이터

DO $$
DECLARE
    default_project_id UUID := '4e3a9b40-cef2-4579-953b-86040c9b10ee'; -- 프로젝트 ID
    default_user_id UUID := '4a321b3e-e3bd-4368-bd4e-d9cbefc1e79f'; -- 사용자 ID
BEGIN
    -- gen_videos 테이블에 나머지 데이터 삽입
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
        resolution,
        is_favorite,
        created_at,
        updated_at,
        completed_at,
        created_by,
        prompt_optimizer,
        model_version
    )
    VALUES
    -- 5번째 비디오 (hailou02-standard, Deep thinking)
    (
        gen_random_uuid(),
        default_project_id,
        'scene',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Silence. Deep thinking character.',
        'completed',
        'hailou02-standard',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Silence. Deep thinking character.',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Silence. Deep thinking character.',
        'https://v3.fal.media/files/panda/vVsba_qSpFPTZIuqrzhfL_fa4e96bc50e847aaab3bbb06e666f1b4.png',
        'https://v3.fal.media/files/lion/kqgLL0cA5FQfu2anwme1I_output.mp4',
        6,
        '768p',
        FALSE,
        '2025-08-09 14:26:09.270586+00'::TIMESTAMPTZ,
        '2025-08-09 15:00:26.613+00'::TIMESTAMPTZ,
        '2025-08-09 14:36:35.859+00'::TIMESTAMPTZ,
        default_user_id,
        TRUE,
        'hailou02-standard'
    ),
    -- 6번째 비디오 (hailou02-standard, natural wiggle)
    (
        gen_random_uuid(),
        default_project_id,
        'scene',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Character natural wiggle. Only 2step action.',
        'completed',
        'hailou02-standard',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Character natural wiggle. Only 2step action.',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Character natural wiggle. Only 2step action.',
        'https://v3.fal.media/files/panda/vVsba_qSpFPTZIuqrzhfL_fa4e96bc50e847aaab3bbb06e666f1b4.png',
        'https://v3.fal.media/files/panda/If2WWTetArdP-8r4_LY7M_output.mp4',
        6,
        '768p',
        FALSE,
        '2025-08-09 14:26:09.270586+00'::TIMESTAMPTZ,
        '2025-08-09 15:00:26.613+00'::TIMESTAMPTZ,
        '2025-08-09 14:36:35.859+00'::TIMESTAMPTZ,
        default_user_id,
        NULL,
        'wan v2.2-a14b-lora'
    ),
    -- 7번째 비디오 (wan v2.2-a14b-lora)
    (
        gen_random_uuid(),
        default_project_id,
        'scene',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Silence',
        'completed',
        'wan v2.2-a14b-lora',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Silence',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Silence',
        'https://v3.fal.media/files/panda/vVsba_qSpFPTZIuqrzhfL_fa4e96bc50e847aaab3bbb06e666f1b4.png',
        'https://v3.fal.media/files/tiger/X4qEyfQJyEXpf6bzoqIef_output.mp4',
        16,
        NULL,
        FALSE,
        '2025-08-09 14:26:09.270586+00'::TIMESTAMPTZ,
        '2025-08-09 15:00:26.613+00'::TIMESTAMPTZ,
        '2025-08-09 14:36:35.859+00'::TIMESTAMPTZ,
        default_user_id,
        NULL,
        'seedance-v1-pro'
    ),
    -- 8번째 비디오 (seedance-v1-pro, fixed camera)
    (
        gen_random_uuid(),
        default_project_id,
        'scene',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Silence',
        'completed',
        'seedance-v1-pro',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Silence',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Silence',
        'https://v3.fal.media/files/panda/vVsba_qSpFPTZIuqrzhfL_fa4e96bc50e847aaab3bbb06e666f1b4.png',
        'https://v3.fal.media/files/elephant/RJQMBEWCT-h6am3HA_3qS_video.mp4',
        5,
        '720p',
        FALSE,
        '2025-08-09 14:26:09.270586+00'::TIMESTAMPTZ,
        '2025-08-09 15:00:26.613+00'::TIMESTAMPTZ,
        '2025-08-09 14:36:35.859+00'::TIMESTAMPTZ,
        default_user_id,
        NULL,
        'seedance-v1-pro'
    ),
    -- 9번째 비디오 (seedance-v1-pro, clench fist)
    (
        gen_random_uuid(),
        default_project_id,
        'scene',
        'Natural movement. No image distortion. No excessive movement. Keep the character in place and clench your fist.',
        'completed',
        'seedance-v1-pro',
        'Natural movement. No image distortion. No excessive movement. Keep the character in place and clench your fist.',
        'Natural movement. No image distortion. No excessive movement. Keep the character in place and clench your fist.',
        'https://v3.fal.media/files/panda/vVsba_qSpFPTZIuqrzhfL_fa4e96bc50e847aaab3bbb06e666f1b4.png',
        'https://v3.fal.media/files/lion/fc1lxwvll86ROfcnScIhX_video.mp4',
        5,
        '720p',
        FALSE,
        '2025-08-09 14:26:09.270586+00'::TIMESTAMPTZ,
        '2025-08-09 15:00:26.613+00'::TIMESTAMPTZ,
        '2025-08-09 14:36:35.859+00'::TIMESTAMPTZ,
        default_user_id,
        NULL,
        'seedance-v1-pro'
    ),
    -- 10번째 비디오 (빈 행이므로 제외)
    -- CSV 파일의 11번째 줄은 빈 줄이므로 추가하지 않음
    
    -- 추가 데이터: camera_movement 필드 업데이트 (seedance 모델들)
    -- 8번째와 9번째 데이터에 camera_movement 추가
    (
        gen_random_uuid(),
        default_project_id,
        'scene',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Silence',
        'completed',
        'seedance-v1-pro',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Silence',
        'No image break, no image shape change. Natural movement. No excessive movement. Keep background. Minimal Animation, natural rigging. **important: Don''t talk. Closed mouth. Silence',
        'https://v3.fal.media/files/panda/vVsba_qSpFPTZIuqrzhfL_fa4e96bc50e847aaab3bbb06e666f1b4.png',
        'https://v3.fal.media/files/elephant/RJQMBEWCT-h6am3HA_3qS_video.mp4',
        5,
        '720p',
        FALSE,
        '2025-08-09 14:26:09.270586+00'::TIMESTAMPTZ,
        '2025-08-09 15:00:26.613+00'::TIMESTAMPTZ,
        '2025-08-09 14:36:35.859+00'::TIMESTAMPTZ,
        default_user_id,
        NULL,
        'seedance-v1-pro'
    );
    
    -- camera_movement 필드 업데이트 (CSV에서 'fixed'로 표시된 것들)
    UPDATE gen_videos 
    SET camera_movement = 'fixed'
    WHERE generation_model = 'seedance-v1-pro' 
    AND project_id = default_project_id
    AND camera_movement IS NULL;
    
END $$;

-- 데이터 확인
SELECT 
    generation_model, 
    COUNT(*) as count,
    array_agg(DISTINCT video_type) as video_types
FROM gen_videos 
WHERE project_id = '4e3a9b40-cef2-4579-953b-86040c9b10ee'
GROUP BY generation_model
ORDER BY generation_model;