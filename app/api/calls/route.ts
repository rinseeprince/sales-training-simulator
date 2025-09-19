import { NextRequest } from 'next/server'
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Validate environment variables
    validateEnvVars()

    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')
    const userId = searchParams.get('userId')

    // Create a fresh Supabase client for this request
    const freshSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // If no callId provided, fetch all calls for the user (for dashboard)
    if (!callId) {
      if (!userId) {
        return errorResponse('userId is required when callId is not provided', 400)
      }

      // Fetch all calls for the user
      const { data: calls, error } = await freshSupabase
        .from('calls')
        .select('*, enhanced_scoring')
        .eq('rep_id', userId)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Supabase fetch error:', error)
        return errorResponse(`Database error: ${error.message}`, 500)
      }

      return successResponse({
        calls: calls || [],
        total: calls?.length || 0
      }, 200, corsHeaders)
    }

    // Fetch specific call by ID
    let query = freshSupabase
      .from('calls')
      .select('*, enhanced_scoring')
      .eq('id', callId)

    // Add user filter if provided
    if (userId) {
      query = query.eq('rep_id', userId)
    }

    const { data: call, error } = await query.single()

    if (error) {
      console.error('Supabase fetch error:', error)
      if (error.code === 'PGRST116') {
        return errorResponse('Call not found', 404)
      }
      return errorResponse(`Database error: ${error.message}`, 500)
    }

    return successResponse(call, 200, corsHeaders)

  } catch (error) {
    console.error('Fetch call error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders })
} 