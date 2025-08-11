// CSV 파일을 gen_videos 테이블로 임포트하는 Node.js 스크립트
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import csvParser from 'csv-parser';
import { v4 as uuidv4 } from 'uuid';

// Supabase 설정
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// 기본 설정
const DEFAULT_PROJECT_ID = '4e3a9b40-cef2-4579-953b-86040c9b10ee'; // 프로젝트 ID
const DEFAULT_USER_ID = '4a321b3e-e3bd-4368-bd4e-d9cbefc1e79f'; // 사용자 ID

async function importVideos() {
  const videos = [];
  
  // CSV 파일 읽기
  fs.createReadStream('/mnt/c/jleavens/semoji_auto/kairos-ai/gen_videos_rows.csv')
    .pipe(csvParser())
    .on('data', (row) => {
      // 빈 문자열을 null로 변환
      const cleanRow = {};
      for (const [key, value] of Object.entries(row)) {
        cleanRow[key] = value === '' ? null : value;
      }
      
      // UUID 필드 자동 생성
      const video = {
        id: uuidv4(),
        project_id: cleanRow.project_id || DEFAULT_PROJECT_ID,
        production_sheet_id: cleanRow.production_sheet_id || null,
        video_type: cleanRow.video_type,
        element_name: cleanRow.element_name,
        description: cleanRow.description,
        generation_status: cleanRow.generation_status,
        generation_model: cleanRow.generation_model,
        model_parameters: cleanRow.model_parameters ? JSON.parse(cleanRow.model_parameters) : null,
        prompt_used: cleanRow.prompt_used,
        custom_prompt: cleanRow.custom_prompt,
        reference_image_url: cleanRow.reference_image_url,
        reference_video_url: cleanRow.reference_video_url,
        result_video_url: cleanRow.result_video_url,
        storage_video_url: cleanRow.storage_video_url,
        thumbnail_url: cleanRow.thumbnail_url,
        duration_seconds: cleanRow.duration_seconds ? parseInt(cleanRow.duration_seconds) : null,
        fps: cleanRow.fps ? parseInt(cleanRow.fps) : null,
        resolution: cleanRow.resolution,
        request_id: cleanRow.request_id,
        metadata: cleanRow.metadata ? JSON.parse(cleanRow.metadata) : null,
        tags: cleanRow.tags ? cleanRow.tags.split(',') : null,
        is_favorite: cleanRow.is_favorite === 'TRUE' || cleanRow.is_favorite === 'true',
        style_id: cleanRow.style_id || null,
        created_at: cleanRow.created_at || new Date().toISOString(),
        updated_at: cleanRow.updated_at || new Date().toISOString(),
        completed_at: cleanRow.completed_at || null,
        created_by: cleanRow.created_by || DEFAULT_USER_ID,
        negative_prompt: cleanRow.negative_prompt,
        aspect_ratio: cleanRow.aspect_ratio,
        person_generation: cleanRow.person_generation,
        camera_movement: cleanRow.camera_movement,
        mode: cleanRow.mode,
        prompt_optimizer: cleanRow.prompt_optimizer === 'TRUE' || cleanRow.prompt_optimizer === 'true',
        model_version: cleanRow.model_version,
        api_request: cleanRow.api_request ? JSON.parse(cleanRow.api_request) : null,
        api_response: cleanRow.api_response ? JSON.parse(cleanRow.api_response) : null,
        credits_used: cleanRow.credits_used ? parseInt(cleanRow.credits_used) : null,
        video_url: cleanRow.video_url,
        linked_scene_id: cleanRow.linked_scene_id || null,
        linked_scene_number: cleanRow.linked_scene_number ? parseInt(cleanRow.linked_scene_number) : null
      };
      
      videos.push(video);
    })
    .on('end', async () => {
      console.log(`CSV 파일 읽기 완료. ${videos.length}개의 비디오 발견.`);
      
      // Supabase에 데이터 삽입
      try {
        const { data, error } = await supabase
          .from('gen_videos')
          .insert(videos);
        
        if (error) {
          console.error('데이터 삽입 오류:', error);
        } else {
          console.log(`✅ ${videos.length}개의 비디오가 성공적으로 추가되었습니다.`);
        }
      } catch (err) {
        console.error('오류 발생:', err);
      }
    })
    .on('error', (err) => {
      console.error('CSV 읽기 오류:', err);
    });
}

// 프로젝트 목록 출력 (참고용)
async function listProjects() {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .order('created_at', { ascending: false });
  
  if (data) {
    console.log('사용 가능한 프로젝트:');
    data.forEach(project => {
      console.log(`- ${project.name}: ${project.id}`);
    });
  }
}

// 사용자 목록 출력 (참고용)
async function listUsers() {
  const { data, error } = await supabase
    .from('auth.users')
    .select('id, email');
  
  if (data) {
    console.log('사용 가능한 사용자:');
    data.forEach(user => {
      console.log(`- ${user.email}: ${user.id}`);
    });
  }
}

// 메인 실행
async function main() {
  console.log('프로젝트 및 사용자 목록 확인...\n');
  
  await listProjects();
  console.log('\n');
  
  // await listUsers(); // 필요시 주석 해제
  
  console.log('\n⚠️  위 목록에서 적절한 프로젝트 ID를 선택하여');
  console.log('   DEFAULT_PROJECT_ID와 DEFAULT_USER_ID를 수정하세요.\n');
  
  // 실제 임포트 실행 (ID 수정 후 주석 해제)
  // await importVideos();
}

main();