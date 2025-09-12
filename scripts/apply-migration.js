// 마이그레이션 적용 스크립트
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const supabase = createClient(
  process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

async function applyMigration() {
  try {
    console.log('Applying migration: add_content_type_to_analysis_jobs.sql');
    
    const migrationPath = join(__dirname, '../database/migrations/add_content_type_to_analysis_jobs.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');
    
    const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
    
    if (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    }
    
    console.log('Migration applied successfully!');
  } catch (err) {
    console.error('Error applying migration:', err);
    process.exit(1);
  }
}

applyMigration();