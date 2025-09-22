import { NextRequest } from 'next/server'
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils'
import { UploadCallRequest, UploadCallResponse } from '@/lib/types'

export async function POST(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Validate environment variables
    validateEnvVars()

    // Parse multipart form data
    const formData = await request.formData()
    const audioFile = formData.get('audioFile') as File
    const metadataString = formData.get('metadata') as string

    if (!audioFile || !metadataString) {
      return errorResponse('Missing audio file or metadata', 400)
    }

    // Parse metadata
    const metadata: UploadCallRequest['metadata'] = JSON.parse(metadataString)
    const { userId, scenarioId, callId, timestamp } = metadata

    if (!userId || !scenarioId || !callId) {
      return errorResponse('Missing required metadata fields', 400)
    }

    // Validate file type and size
    if (!audioFile.type.startsWith('audio/')) {
      return errorResponse('Invalid file type. Only audio files are allowed.', 400)
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (audioFile.size > maxSize) {
      return errorResponse('File size too large. Maximum size is 10MB.', 400)
    }

    // Generate unique filename
    const fileExtension = audioFile.name.split('.').pop() || 'webm'
    const fileName = `calls/${callId}.${fileExtension}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('call-audio')
      .upload(fileName, audioFile, {
        cacheControl: '3600',
        upsert: false
      })

    if (uploadError) {
      console.error('Supabase storage upload error:', uploadError)
      return errorResponse('Failed to upload audio file', 500)
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('call-audio')
      .getPublicUrl(fileName)

    const audioUrl = urlData.publicUrl

    // Save metadata to database
    const { error: dbError } = await supabase
      .from('calls')
      .upsert({
        id: callId,
        rep_id: userId,
        scenario_id: scenarioId,
        audio_url: audioUrl,
        audio_file_size: audioFile.size,
        created_at: timestamp,
        updated_at: new Date().toISOString()
      })

    if (dbError) {
      console.error('Supabase database insert error:', dbError)
      // Note: We don't fail here since the file was uploaded successfully
      // We can retry the database insert later if needed
    }

    const response: UploadCallResponse = {
      audioUrl,
      callId,
      success: true,
      message: 'Audio uploaded successfully'
    }

    return successResponse(response, 200, corsHeaders)

  } catch (error) {
    console.error('Upload call error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}

export async function OPTIONS(_request: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders })
} 