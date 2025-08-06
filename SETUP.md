# 🚀 Complete Setup Guide for Real-Time Voice Streaming

## 🔧 **Immediate Fixes Required**

### **1. Create Supabase Storage Bucket**

**Option A: Via Supabase Dashboard (Recommended)**
1. Go to your Supabase Dashboard
2. Navigate to **Storage** (left sidebar)
3. Click **"Create a new bucket"**
4. Fill in:
   - **Name**: `call-audio`
   - **Public bucket**: ✅ **Check this box**
   - **File size limit**: `10MB`
   - **Allowed MIME types**: `audio/webm, audio/mpeg, audio/wav, audio/ogg`

**Option B: Via SQL (if dashboard doesn't work)**
Run this SQL in your Supabase SQL Editor:

```sql
-- Enable RLS on storage.objects
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Policy for authenticated users to upload audio files
CREATE POLICY "Users can upload audio files" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'call-audio' 
  AND auth.role() = 'authenticated'
);

-- Policy for users to view their own audio files
CREATE POLICY "Users can view their audio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'call-audio' 
  AND auth.role() = 'authenticated'
);

-- Policy for users to delete their own audio files
CREATE POLICY "Users can delete their audio files" ON storage.objects
FOR DELETE USING (
  bucket_id = 'call-audio' 
  AND auth.role() = 'authenticated'
);

-- Policy for public access to audio files (for playback)
CREATE POLICY "Public access to audio files" ON storage.objects
FOR SELECT USING (
  bucket_id = 'call-audio'
);
```

**Note**: If you get permission errors, use Option A (Dashboard) instead.

### **2. Verify Environment Variables**
Ensure your `.env.local` has all required keys:

```env
# OpenAI Configuration
OPENAI_API_KEY=sk-your-openai-api-key-here

# ElevenLabs Configuration
ELEVENLABS_API_KEY=your-elevenlabs-api-key-here
DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here

# Optional: Debug Mode
DEBUG_AUDIO=true
DEBUG_STREAMING=true
DEBUG_TRANSCRIPTION=true
```

### **3. Test API Keys**
Run these commands to verify your APIs work:

```bash
# Test OpenAI
curl -X POST http://localhost:3000/api/start-simulation \
  -H "Content-Type: application/json" \
  -d '{"scenarioPrompt": "Test scenario"}'

# Test ElevenLabs (if you have the key)
curl -X POST http://localhost:3000/api/stream-gpt-voice \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Hello", "scenarioPrompt": "Test"}'
```

## 🎯 **Testing Steps**

### **Step 1: Test Basic Functionality**
1. Go to `http://localhost:3000/scenario-builder`
2. Fill in scenario details
3. **Enable "Real-Time Voice Streaming (beta)"**
4. Click "Start Live Simulation"

### **Step 2: Test Real-Time Streaming**
1. On simulation page, click "Start Call"
2. Allow microphone access
3. Speak clearly: "Hello, I'm calling about your project management needs"
4. Watch for:
   - Real-time transcription
   - AI response generation
   - Voice playback

### **Step 3: Test Fallback Mode**
1. In scenario builder, **disable** streaming toggle
2. Start simulation
3. Verify traditional mode works

## 🔍 **Debugging Checklist**

### **If Whisper Transcription Fails:**
- ✅ Language format fixed (now uses 'en' instead of 'en-US')
- ✅ API key valid and has credits
- ✅ Audio format is WebM/Opus

### **If Audio Upload Fails:**
- ✅ Supabase storage bucket exists
- ✅ Storage policies are set correctly
- ✅ File size under 10MB
- ✅ Audio format is supported

### **If Streaming Doesn't Work:**
- ✅ ElevenLabs API key is valid
- ✅ OpenAI API key has sufficient credits
- ✅ Network connectivity is stable
- ✅ Browser supports SSE

### **If CORS Errors Occur:**
- ✅ Storage bucket has public access
- ✅ CORS origins set to '*'
- ✅ Proper RLS policies in place

## 🚨 **Common Issues & Solutions**

### **"No audio to upload" Error**
**Cause**: Audio recording didn't start properly
**Solution**: 
- Check microphone permissions
- Ensure HTTPS in production
- Try refreshing the page

### **"Transcription failed: 500" Error**
**Cause**: Whisper API language format issue
**Solution**: ✅ **FIXED** - Language now uses ISO-639-1 format

### **"Failed to load resource" CORS Error**
**Cause**: Storage bucket not configured properly
**Solution**: Run the Supabase storage setup SQL above

### **"Streaming not working"**
**Cause**: API keys or network issues
**Solution**:
- Verify all API keys are valid
- Check browser console for specific errors
- Ensure stable internet connection

## 📊 **Expected Behavior**

### **When Working Correctly:**
1. **Start Call** → Microphone activates, waveform shows
2. **Speak** → Real-time transcription appears
3. **AI Response** → Text builds progressively, voice plays
4. **Turn-taking** → Mic disabled during AI speech
5. **End Call** → Audio uploads, redirects to review

### **Performance Metrics:**
- **Transcription**: 1-3 seconds delay
- **AI Response**: 2-5 seconds to start
- **Voice Playback**: Immediate as chunks arrive
- **Overall Latency**: 3-8 seconds total

## 🎉 **Success Indicators**

You'll know it's working when:
- ✅ Real-time transcription appears as you speak
- ✅ AI responds with progressive text building
- ✅ Voice plays automatically
- ✅ Mic automatically enables/disables
- ✅ Audio uploads successfully after call
- ✅ No console errors (or minimal expected ones)

## 🆘 **Still Having Issues?**

If you're still experiencing problems:

1. **Check Console**: Look for specific error messages
2. **Verify APIs**: Test each API key individually
3. **Check Network**: Ensure stable internet connection
4. **Browser**: Try Chrome (best support)
5. **HTTPS**: Required for microphone access in production

The system should now be fully functional with real-time voice-to-voice conversations! 🎙️🤖 