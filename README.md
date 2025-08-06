# Sales Roleplay Simulator - Real-Time Voice-to-Voice AI Conversations

A comprehensive sales training simulator built with Next.js API routes, OpenAI GPT-4o, ElevenLabs voice synthesis, and Supabase database. **Now with real-time, two-way, voice-to-voice AI conversations!**

## 🚀 New Real-Time Voice Streaming Features (v3.0)

### Real-Time Voice-to-Voice Conversations
- **Live Voice Transcription**: Real-time speech-to-text using Web Speech API or OpenAI Whisper
- **Streaming AI Responses**: GPT-4o generates responses in real-time with Server-Sent Events (SSE)
- **Progressive Audio Playback**: ElevenLabs TTS streams audio chunks as they're generated
- **Smart State Management**: Intelligent conversation flow with automatic turn-taking
- **Fallback Support**: Graceful degradation to traditional full-response mode

### Technical Architecture
- **Audio Chunking**: 5-second audio chunks for optimal streaming performance
- **Sentence-Based Processing**: Natural conversation flow with sentence-level chunking
- **Audio Queue Management**: Seamless audio playback with automatic queuing
- **State Machine**: Clean transitions between recording, transcribing, thinking, and speaking states

### Streaming Flow
1. **Rep speaks** → Audio chunked every 5 seconds
2. **Whisper transcription** → Real-time speech-to-text
3. **GPT-4o streaming** → Progressive response generation
4. **ElevenLabs TTS** → Audio chunks generated per sentence
5. **Progressive playback** → AI voice plays as chunks arrive

## 🎤 Audio Recording & Playback Features (v2.0)

### Live Call Recording
- **Real-time Audio Capture**: MediaRecorder API integration for high-quality microphone recording
- **Live Waveform Visualization**: Real-time audio feedback during recording sessions
- **Automatic Upload**: Seamless audio file upload to Supabase Storage when calls end
- **Error Handling**: Graceful fallbacks for microphone access and browser compatibility

### Post-Call Audio Playback
- **WaveSurfer.js Integration**: Professional waveform visualization and playback controls
- **Advanced Controls**: Play/pause, seek, volume control, playback speed (0.5x - 2x)
- **Download Capability**: Optional audio file download for compliance and review
- **Responsive Design**: Mobile-friendly audio player matching enterprise UI standards

### Technical Implementation
- **Audio Format**: WebM with Opus codec (optimal quality/size balance)
- **Storage**: Supabase Storage with secure access controls
- **File Size**: 10MB maximum with automatic validation
- **Security**: User-based permissions and GDPR compliance support

## Features

- 🎙️ **Real-Time Voice Conversations**: Two-way voice-to-voice AI conversations with streaming responses
- 🤖 **AI-Powered Simulations**: GPT-4o generates realistic customer personas and responses
- 🎤 **Voice Synthesis**: ElevenLabs integration for high-quality voice output
- 🎙️ **Audio Recording**: Full call recording with MediaRecorder API and real-time waveform visualization
- 📊 **Call Scoring**: AI evaluation of sales calls with detailed feedback
- 🎵 **Audio Playback**: WaveSurfer.js integration for waveform visualization and playback controls
- 🏆 **Leaderboard**: Performance tracking and certifications
- 👥 **Role-Based Access**: Rep, Manager, and Admin roles
- 📝 **Scenario Builder**: Create and save custom training scenarios with streaming options
- 🔒 **Authentication**: Secure user authentication with Supabase Auth

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **AI**: OpenAI GPT-4o + Whisper
- **Voice**: ElevenLabs API
- **Real-Time**: Server-Sent Events (SSE) + Web Speech API
- **Audio Recording**: MediaRecorder API + WaveSurfer.js
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **UI**: Tailwind CSS + Radix UI

## Quick Start

### 1. Install Dependencies

```bash
npm install --legacy-peer-deps
npm install wavesurfer.js --legacy-peer-deps
```

### 2. Environment Setup

Create a `.env.local` file in the root directory:

```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# ElevenLabs Configuration (Optional)
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional: Voice Settings
DEFAULT_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

### 3. Database Setup

Create the following tables in your Supabase database:

#### Users Table
```sql
CREATE TABLE users (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'rep' CHECK (role IN ('rep', 'manager', 'admin')),
  department TEXT DEFAULT 'Sales',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Scenarios Table
```sql
CREATE TABLE scenarios (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  prompt TEXT NOT NULL,
  settings JSONB DEFAULT '{}',
  persona TEXT DEFAULT 'potential customer',
  difficulty TEXT DEFAULT 'medium',
  industry TEXT DEFAULT 'general',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Calls Table
```sql
CREATE TABLE calls (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rep_id UUID REFERENCES users(id) ON DELETE CASCADE,
  scenario_name TEXT NOT NULL,
  transcript JSONB NOT NULL,
  score INTEGER DEFAULT 0,
  talk_ratio DECIMAL DEFAULT 0,
  objections_handled INTEGER DEFAULT 0,
  cta_used BOOLEAN DEFAULT FALSE,
  sentiment TEXT DEFAULT 'neutral',
  feedback TEXT[] DEFAULT '{}',
  duration INTEGER DEFAULT 0,
  audio_url TEXT,
  audio_duration INTEGER,
  audio_file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Audio Storage Setup

Create a Supabase Storage bucket for audio files:

1. Go to your Supabase dashboard
2. Navigate to Storage
3. Create a new bucket called `call-audio`
4. Set the bucket to public (or configure RLS policies as needed)
5. Configure CORS if needed for your domain

**Storage Bucket Configuration:**
```sql
-- Optional: Set up RLS policies for the call-audio bucket
CREATE POLICY "Users can upload their own audio files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'call-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own audio files" ON storage.objects
  FOR SELECT USING (bucket_id = 'call-audio' AND auth.uid()::text = (storage.foldername(name))[1]);
```

### 5. Run Development Server

```bash
npm run dev
```

The API will be available at `http://localhost:3000/api/`

## 🎤 Audio Implementation Guide

### How Audio Recording Works

1. **Live Recording Process**:
   - User starts a simulation → MediaRecorder API begins recording
   - Real-time waveform visualization shows audio levels
   - Audio stored as WebM blob in browser memory
   - When call ends → automatic upload to Supabase Storage

2. **Audio Upload Flow**:
   ```
   Browser → MediaRecorder → WebM Blob → FormData → /api/upload-call → Supabase Storage
   ```

3. **Playback Process**:
   ```
   Supabase Storage → /api/calls → AudioPlayer Component → WaveSurfer.js → Audio Playback
   ```

### Key Components

#### `useAudioRecorder` Hook
```typescript
const {
  isRecording,
  isPaused,
  duration,
  error,
  startRecording,
  stopRecording,
  uploadAudio
} = useAudioRecorder();
```

#### `AudioPlayer` Component
```typescript
<AudioPlayer 
  audioUrl="https://storage.example.com/audio/call-123.webm"
  showDownload={true}
  onTimeUpdate={(time) => console.log('Current time:', time)}
/>
```

#### `AudioWaveform` Component
```typescript
<AudioWaveform 
  isRecording={true}
  isPaused={false}
  className="h-20"
/>
```

### Browser Compatibility

**Supported Browsers**:
- ✅ Chrome 66+
- ✅ Firefox 60+
- ✅ Safari 14.1+
- ✅ Edge 79+

**Required Permissions**:
- Microphone access (HTTPS required for production)
- Storage quota for audio blobs

### Audio File Specifications

- **Format**: WebM with Opus codec
- **Sample Rate**: 44.1kHz
- **Channels**: Mono
- **Max File Size**: 10MB
- **Quality**: Optimized for voice recording

## API Endpoints

### Authentication

#### POST `/api/auth`
**Login/Register user**

```json
{
  "email": "user@example.com",
  "password": "password123",
  "action": "login" // or "register"
}
```

**Response:**
```json
{
  "user": { /* user object */ },
  "session": { /* session object */ },
  "profile": { /* user profile */ },
  "message": "Login successful"
}
```

#### GET `/api/auth`
**Get current user session**

Headers: `Authorization: Bearer <token>`

#### DELETE `/api/auth`
**Logout user**

Headers: `Authorization: Bearer <token>`

### Simulations

#### POST `/api/start-simulation`
**Start a new sales simulation**

```json
{
  "scenarioPrompt": "Sell a software solution to a small business owner",
  "persona": "busy entrepreneur",
  "voiceSettings": {
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "stability": 0.5,
    "similarityBoost": 0.5
  }
}
```

**Response:**
```json
{
  "aiResponse": "Hello, I'm interested in learning more about your software solution.",
  "audioUrl": "data:audio/mpeg;base64,...",
  "timestamp": "2024-01-01T12:00:00Z"
}
```

#### POST `/api/score-call`
**Evaluate a completed sales call**

```json
{
  "transcript": [
    { "speaker": "rep", "message": "Hello, how can I help you today?" },
    { "speaker": "ai", "message": "I'm looking for a CRM solution." }
  ]
}
```

**Response:**
```json
{
  "score": 85,
  "talkRatio": 60.5,
  "objectionsHandled": 3,
  "ctaUsed": true,
  "sentiment": "friendly",
  "feedback": [
    "Great rapport building at the beginning",
    "Effectively handled pricing objections",
    "Could improve closing technique"
  ],
  "metrics": {
    "totalMessages": 20,
    "repMessages": 12,
    "aiMessages": 8,
    "duration": 600
  }
}
```

### Data Management

#### POST `/api/save-transcript`
**Save call transcript and results**

```json
{
  "transcript": [/* transcript array */],
  "repId": "user-uuid",
  "scenarioName": "Software Sales",
  "score": 85,
  "talkRatio": 60.5,
  "objectionsHandled": 3,
  "ctaUsed": true,
  "sentiment": "friendly",
  "feedback": ["feedback points"],
  "duration": 600,
  "audioUrl": "https://storage.example.com/audio/call-123.webm",
  "audioDuration": 600,
  "audioFileSize": 2048576
}
```

#### POST `/api/upload-call`
**Upload call audio file**

Content-Type: `multipart/form-data`

Form Data:
- `audioFile`: Audio file (webm, wav, or mp3)
- `metadata`: JSON string with call metadata

```json
{
  "audioFile": "audio-blob",
  "metadata": {
    "userId": "user-uuid",
    "scenarioId": "scenario-uuid", 
    "callId": "call-uuid",
    "timestamp": "2024-01-01T12:00:00Z"
  }
}
```

**Response:**
```json
{
  "audioUrl": "https://storage.example.com/audio/calls/call-123.webm",
  "callId": "call-uuid",
  "success": true,
  "message": "Audio uploaded successfully"
}
```

#### GET `/api/calls?callId=call-uuid&userId=user-uuid`
**Get call data including audio URL**

**Response:**
```json
{
  "id": "call-uuid",
  "rep_id": "user-uuid",
  "scenario_name": "Software Sales",
  "transcript": [/* transcript array */],
  "score": 85,
  "audio_url": "https://storage.example.com/audio/calls/call-123.webm",
  "audio_duration": 600,
  "audio_file_size": 2048576,
  "created_at": "2024-01-01T12:00:00Z"
}
```

#### GET `/api/scenarios?userId=user-uuid`
**Get user's saved scenarios**

#### POST `/api/scenarios`
**Save a new scenario**

```json
{
  "title": "Enterprise Software Sales",
  "prompt": "Sell enterprise software to a large corporation",
  "userId": "user-uuid",
  "persona": "IT Director",
  "difficulty": "hard",
  "industry": "Technology",
  "tags": ["enterprise", "software", "B2B"],
  "settings": {
    "enableStreaming": true,
    "voiceSettings": {
      "voiceId": "21m00Tcm4TlvDq8ikWAM",
      "stability": 0.5,
      "similarityBoost": 0.5
    }
  }
}
```

### Real-Time Voice Streaming APIs

#### POST `/api/stream-gpt-voice`
**Real-time voice-to-voice conversation streaming**

**Request:**
```json
{
  "transcript": "Hello, I'm calling about your software solution",
  "scenarioPrompt": "You are a C-Level executive...",
  "persona": "C-Level Executive",
  "voiceSettings": {
    "voiceId": "21m00Tcm4TlvDq8ikWAM",
    "stability": 0.5,
    "similarityBoost": 0.5
  },
  "conversationHistory": [
    {
      "role": "rep",
      "content": "Previous rep message",
      "timestamp": "2024-01-01T12:00:00Z"
    }
  ]
}
```

**Response (Server-Sent Events):**
```
data: {"type":"text_chunk","content":"Hello, I appreciate","chunkId":1,"isComplete":false}
data: {"type":"audio_chunk","audioUrl":"data:audio/mpeg;base64,...","chunkId":1,"text":"Hello, I appreciate"}
data: {"type":"completion","fullResponse":"Hello, I appreciate you calling...","totalChunks":3,"timestamp":"2024-01-01T12:00:00Z"}
```

#### POST `/api/transcribe-audio`
**Real-time audio transcription using Whisper**

**Request:** FormData with audio file
```javascript
const formData = new FormData();
formData.append('audio', audioBlob, 'chunk.webm');
formData.append('language', 'en');
```

**Response:**
```json
{
  "text": "Hello, I'm calling about your software solution",
  "confidence": 0.95,
  "language": "en",
  "duration": 3.2,
  "timestamp": "2024-01-01T12:00:00Z"
}
```

### Analytics

#### GET `/api/leaderboard?timeRange=month&limit=20`
**Get sales performance leaderboard**

Query Parameters:
- `timeRange`: `all`, `week`, `month`, `year`
- `limit`: Number of results (default: 50)
- `role`: Filter by role (default: `all`)

**Response:**
```json
{
  "leaderboard": [
    {
      "repId": "user-uuid",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "rep",
      "department": "Sales",
      "totalCalls": 25,
      "averageScore": 87.5,
      "ctaSuccessRate": 75.0,
      "avgObjectionsHandled": 2.8,
      "certifications": ["Sales Professional", "Experienced Rep"]
    }
  ],
  "overallStats": {
    "totalReps": 15,
    "totalCalls": 250,
    "averageScore": 82.3,
    "topPerformer": { /* top performer data */ }
  }
}
```

## Authentication & Authorization

The API uses Supabase Auth with role-based access control:

- **Rep**: Can access simulations, save calls, view own scenarios
- **Manager**: Can access all rep features plus team analytics
- **Admin**: Full access to all features including user management

Protected routes require the `Authorization: Bearer <token>` header.

## Error Handling

All API endpoints return consistent error responses:

```json
{
  "error": "Error message description"
}
```

Common HTTP status codes:
- `200`: Success
- `201`: Created
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `500`: Internal Server Error

## Development

### Project Structure

```
app/
├── api/                    # API routes
│   ├── auth/              # Authentication
│   ├── leaderboard/       # Performance analytics
│   ├── save-transcript/   # Call data storage
│   ├── scenarios/         # Scenario management
│   ├── score-call/        # Call evaluation
│   └── start-simulation/  # Simulation initialization
├── components/            # Frontend components
├── dashboard/             # Dashboard pages
├── simulation/            # Simulation interface
└── ...
lib/
├── api-utils.ts          # Shared API utilities
└── auth-middleware.ts    # Authentication middleware
```

### Adding New Endpoints

1. Create a new directory in `app/api/`
2. Add `route.ts` with HTTP method handlers
3. Use shared utilities from `lib/api-utils.ts`
4. Add authentication middleware if needed
5. Update this README with documentation

### Testing

Test the API endpoints using tools like Postman or curl:

```bash
# Test start simulation
curl -X POST http://localhost:3000/api/start-simulation \
  -H "Content-Type: application/json" \
  -d '{"scenarioPrompt": "Test scenario"}'

# Test with authentication
curl -X GET http://localhost:3000/api/scenarios \
  -H "Authorization: Bearer your-token-here"
```

## Deployment

### Vercel (Recommended)

1. Connect your GitHub repository to Vercel
2. Add environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Other Platforms

The API is compatible with any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 🚀 Getting Started with Real-Time Voice Streaming

### Step 1: Enable Streaming in Scenario Builder
1. Navigate to `/scenario-builder` page
2. Fill in scenario details
3. **Enable "Real-Time Voice Streaming (beta)" toggle**
4. Configure voice settings (optional)
5. Click "Start Live Simulation"

### Step 2: Test Real-Time Voice Conversation
1. Navigate to `/simulation` page
2. Click "Start Call" - browser will request microphone permission
3. **Speak naturally** - you'll see real-time transcription
4. **AI responds in real-time** - voice plays as it's generated
5. **Automatic turn-taking** - mic disabled during AI speech
6. Click "End Call" when finished

### Step 3: Test Traditional Mode (Fallback)
1. In scenario builder, **disable** streaming toggle
2. Start simulation - uses traditional full-response mode
3. Compare experience with streaming mode

## 🎤 Getting Started with Audio Features

### Step 1: Test Audio Recording
1. Navigate to `/simulation` page
2. Click "Start Call" - browser will request microphone permission
3. Speak into microphone - you should see live waveform visualization
4. Click "End Call" - audio will automatically upload

### Step 2: Test Audio Playback
1. Navigate to `/review` page
2. If audio was recorded, you'll see the "Call Recording" section
3. Use the audio player controls to test playback
4. Try different playback speeds and volume controls

### Step 3: Verify Storage
1. Check Supabase Storage dashboard
2. Look for files in the `call-audio` bucket
3. Verify file permissions and access

## 🔧 Troubleshooting

### Real-Time Streaming Issues

**Streaming Not Working**:
- Ensure `enableStreaming: true` in scenario settings
- Check browser console for SSE connection errors
- Verify OpenAI and ElevenLabs API keys are valid
- Check network connectivity for real-time streaming

**Audio Chunks Not Playing**:
- Check browser audio autoplay policies
- Verify ElevenLabs API is responding
- Check audio queue management in browser console
- Ensure microphone permissions are granted

**Transcription Delays**:
- Check Whisper API response times
- Verify audio chunk size (5 seconds optimal)
- Check network latency to OpenAI servers
- Consider switching to Web Speech API for faster transcription

### Traditional Audio Issues

**Microphone Access Denied**:
- Ensure HTTPS in production (required for microphone access)
- Check browser permissions
- Try refreshing the page

**Audio Upload Fails**:
- Verify Supabase Storage bucket exists
- Check network connectivity
- Review browser console for errors

**WaveSurfer.js Not Loading**:
- Ensure `wavesurfer.js` is installed
- Check for JavaScript errors in console
- Verify audio file format is supported

**Audio Playback Issues**:
- Check if audio file exists in storage
- Verify CORS settings on Supabase bucket
- Test with different browsers

### Debug Mode

Enable debug logging by adding to your `.env.local`:
```env
DEBUG_AUDIO=true
DEBUG_STREAMING=true
DEBUG_TRANSCRIPTION=true
```

### SSE/WebSocket Debugging

For real-time streaming debugging:
1. Open browser DevTools → Network tab
2. Filter by "EventSource" or "Fetch"
3. Look for `/api/stream-gpt-voice` requests
4. Check for SSE data events in response
5. Monitor audio chunk delivery and playback

### Audio Queuing Debugging

Check audio queue management:
```javascript
// In browser console
console.log('Audio queue length:', audioQueue.current.length);
console.log('Is playing audio:', isPlayingAudio.current);
console.log('Current audio element:', currentAudioRef.current);
```

### Performance Optimization

For production deployments:
1. **CDN**: Use Supabase CDN for faster audio delivery
2. **Compression**: Consider audio compression for large files
3. **Caching**: Implement audio file caching strategies
4. **Monitoring**: Set up audio upload/download monitoring

## 📋 Next Steps for ChatGPT

When asking ChatGPT for help with this project, include:

1. **Current Status**: Audio recording and playback system is fully implemented
2. **Tech Stack**: Next.js 15, TypeScript, Supabase, WaveSurfer.js, MediaRecorder API
3. **Key Files**: 
   - `hooks/use-audio-recorder.ts` - Audio recording logic
   - `components/ui/audio-player.tsx` - Playback component
   - `app/api/upload-call/route.ts` - Upload endpoint
   - `app/api/calls/route.ts` - Call data retrieval

4. **Specific Questions**:
   - How to deploy to production with HTTPS?
   - How to optimize audio file sizes?
   - How to implement audio analytics?
   - How to add transcription to audio files?
   - How to implement real-time audio streaming?

## License

MIT License - see LICENSE file for details # sales-training-simulator
