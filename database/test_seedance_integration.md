# SeedDance Video Model Integration Test Plan

## Database Migration Required
Run the migration script to add missing columns:
```sql
-- Execute in Supabase SQL Editor
-- Path: database/migrations/add_video_generation_fields.sql
```

## Integration Checklist

### ✅ Completed Tasks
1. **Database Schema Updates**
   - Added `camera_movement` column for camera settings
   - Added `model_version` column for model versioning
   - Added `api_request` column to store API requests
   - Added `credits_used` column for credit tracking
   - Added `linked_scene_id` column for storyboard connection
   - Added additional model-specific columns

2. **Backend Implementation**
   - Created `/netlify/functions/generateSeedanceVideo.js`
   - Integrated with FAL AI queue system
   - Proper parameter mapping to DB schema
   - Dynamic credit calculation based on resolution/duration
   - Support for both router-based and direct calls

3. **Router Integration**
   - Added SeedDance cases in `generateVideoAsync.js`
   - Proper routing to SeedDance function
   - Parameter passing between router and function

4. **Frontend Implementation**
   - Added SeedDance to model dropdown in `VideoGenerationModal.vue`
   - Created UI controls for SeedDance parameters:
     - Resolution selector (480p, 720p, 1080p)
     - Duration selector (3, 5, 7, 10 seconds)
     - Camera movement toggle (fixed/dynamic)
     - Optional seed input for reproducibility
   - Parameter state management with `seedanceParams` ref

5. **Parameter Mapping**
   - `resolution` → stored directly as string
   - `duration` → stored as `duration_seconds` (integer)
   - `cameraFixed` → mapped to `camera_movement` field
   - `seed` → stored in metadata JSONB
   - `imageUrl` → stored as `reference_image_url`

## Testing Steps

### 1. Database Migration
```bash
# Apply the migration in Supabase SQL Editor
# Check that new columns exist in gen_videos table
```

### 2. Test Video Generation
1. Navigate to a project's video tab
2. Click "새 비디오" button
3. Select "🌟 ByteDance SeedDance Pro (Image-to-Video)" from dropdown
4. Upload or select a reference image
5. Enter a prompt
6. Configure parameters:
   - Resolution: 1080p
   - Duration: 5 seconds
   - Camera: Dynamic
7. Click "비디오 생성"

### 3. Verify Processing
- Check that video appears in processing state
- Verify that `processVideoQueue` worker picks it up
- Monitor for completion

### 4. Expected Results
- Video should be generated successfully
- Stored in Supabase storage under `gen-videos` bucket
- Proper metadata saved including all parameters
- Credits calculated based on resolution and duration

## Credit Calculation
- 480p: 20 credits base
- 720p: 40 credits base
- 1080p: 60 credits base
- Additional 10% per second over 3 seconds

## Known Issues & Fixes
- ✅ Fixed: Parameter passing from modal to backend
- ✅ Fixed: Database schema missing required columns
- ✅ Fixed: Router integration for SeedDance model
- ✅ Fixed: UI controls for model-specific parameters

## API Endpoints
- Router: `/.netlify/functions/generateVideoAsync`
- SeedDance: `/.netlify/functions/generateSeedanceVideo`
- Queue Processor: `/.netlify/functions/processVideoQueue`

## FAL AI Integration
- Endpoint: `https://queue.fal.run/fal-ai/seedance-v1-pro-image-to-video`
- Required: FAL_API_KEY environment variable
- Queue-based async processing with status polling