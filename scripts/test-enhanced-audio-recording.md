# Enhanced Audio Recording Test Guide

This guide helps you test the new enhanced audio recording feature that captures both your voice and the AI prospect's voice in call recordings.

## What Changed

### Before (Issue)
- Only captured microphone input (your voice)
- AI voice played through speakers but wasn't recorded
- Call recordings were incomplete

### After (Solution)
- **Mixed Audio Streams**: Combines microphone input + AI audio output
- **Full Conversation Recording**: Both voices captured in one recording
- **No User Interaction Required**: Works automatically, no screen sharing needed

## How to Test

### 1. Start a New Simulation
1. Go to `/scenario-builder` and create a scenario
2. Enable streaming mode for best results
3. Click "Start Simulation" to go to live simulation

### 2. Start Call Recording
1. Click "Start Call" - this now uses enhanced recording
2. You should see console logs: "Starting enhanced audio recording with mixed streams..."
3. Check browser console for: "AudioContext created", "Audio mixing nodes created"

### 3. Have a Conversation
1. Press Space to record your message
2. Speak clearly and release Space to send
3. When AI responds, you should see: "Registering AI audio with enhanced recorder"
4. Continue the conversation for 2-3 exchanges

### 4. End Call and Check Recording
1. Click "End Call"
2. Wait for analysis to complete
3. In the review modal, look for the "Call Recording" section
4. Play the audio - **you should now hear BOTH voices**:
   - Your voice from the microphone
   - AI prospect's voice from the system

### 5. Verify Console Logs
Look for these key logs during the process:

**Recording Start:**
```
Starting enhanced audio recording with mixed streams...
AudioContext created, state: running
Audio mixing nodes created and connected
Mixed MediaRecorder started successfully
```

**AI Audio Integration:**
```
Queueing audio for playback and recording: data:audio/mpeg;base64...
Registering AI audio with enhanced recorder
Added AI audio to mix, total sources: 1
```

**Recording End:**
```
Mixed MediaRecorder stopped, chunks count: X
Created mixed audio blob, size: XXXXX, type: audio/webm
Mixed audio recording completed successfully
```

## Troubleshooting

### If Only Your Voice is Still Captured
1. Check console for errors in AudioContext creation
2. Verify "Registering AI audio with enhanced recorder" appears
3. Ensure browser supports Web Audio API (Chrome/Firefox/Safari/Edge)

### If No Audio is Captured
1. Check microphone permissions
2. Verify AudioContext is not suspended
3. Look for MediaRecorder errors in console

### If Audio Quality is Poor
1. Check for audio clipping warnings
2. Verify gain levels are appropriate (0.7 for mixer, 0.8 for AI)
3. Ensure sample rate compatibility (44.1kHz)

## Technical Details

### Audio Mixing Architecture
```
Microphone Input → MediaStreamSource → GainNode (0.7) → Mixer
AI Audio Element → MediaElementSource → GainNode (0.8) → Mixer
Mixer → MediaStreamDestination → MediaRecorder → Recording File
```

### Browser Compatibility
- ✅ Chrome 66+
- ✅ Firefox 60+  
- ✅ Safari 14.1+
- ✅ Edge 79+

### File Format
- Format: WebM with Opus codec
- Sample Rate: 44.1kHz
- Channels: Mixed to mono
- Quality: Optimized for voice

## Success Criteria

✅ **Both voices audible** in the final recording
✅ **No echo or feedback** during conversation  
✅ **Good audio quality** for both speakers
✅ **Automatic operation** - no user prompts needed
✅ **Console logs** show proper integration

## Known Limitations

1. **Browser Audio Policies**: Some browsers may require user interaction before AudioContext can be created
2. **Memory Usage**: Slightly higher due to audio mixing processes
3. **Latency**: Minimal additional latency from audio processing
4. **File Size**: May be slightly larger due to mixed audio streams

## Fallback Behavior

If enhanced recording fails, the system will:
1. Fall back to standard microphone-only recording
2. Log the error to console
3. Continue with normal simulation functionality
4. Still provide call analysis and feedback

## **🔍 Database Issue Confirmed**

You're absolutely right - this is a **database setup issue**. Here's what happened:

1. **The main schema files** (`simple-auth-schema.sql`, `setup-database.sql`) don't include the `enhanced_scoring` column
2. **The `enhanced_scoring` column** was supposed to be added via a separate migration (`add-enhanced-scoring-column.sql`)
3. **This migration was never run** on your database
4. **Result**: The API tries to save `enhanced_scoring` data to a column that doesn't exist

## **✅ Solution:**

You need to run the database migration to add the `enhanced_scoring` column. Here's what you need to do:

### **1. Run this SQL in your Supabase SQL Editor:**

```sql
-- Add enhanced_scoring column to calls table
ALTER TABLE calls 
ADD COLUMN IF NOT EXISTS enhanced_scoring JSONB DEFAULT NULL;

-- Add index for better query performance
CREATE INDEX IF NOT EXISTS idx_calls_enhanced_scoring 
ON calls USING GIN (enhanced_scoring);

-- Update existing calls to have a default enhanced_scoring structure
UPDATE calls 
SET enhanced_scoring = jsonb_build_object(
    'overallScore', COALESCE(score, 0),
    'strengths', ARRAY[]::text[],
    'areasForImprovement', ARRAY[]::text[],
    'keyMoments', '[]'::jsonb,
    'coachingTips', ARRAY[]::text[],
    'scenarioFit', 50,
    'readyForRealCustomers', false
)
WHERE enhanced_scoring IS NULL;
```

### **2. Verify the fix:**

After running the migration, you can verify it worked by running this query:

```sql
-- Check if the column was added successfully
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'calls' AND column_name = 'enhanced_scoring';

-- Check existing calls
SELECT id, scenario_name, score, enhanced_scoring 
FROM calls 
ORDER BY created_at DESC 
LIMIT 5;
```

### **3. Test the application:**

After running the database migration:
1. Complete a new simulation
2. Save it 
3. Close the tab and reopen
4. The coaching feedback should now persist correctly

The code changes I made earlier were correct - the issue was simply that the database didn't have the required column to store the data!
