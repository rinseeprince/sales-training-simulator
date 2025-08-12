import { NextRequest } from 'next/server'
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Validate environment variables
    validateEnvVars()

    const callId = params.id

    if (!callId) {
      return errorResponse('Call ID is required', 400)
    }

    console.log('Deleting call:', { callId })

    // Delete the call from the database
    const { data, error } = await supabase
      .from('calls')
      .delete()
      .eq('id', callId)
      .select()
      .single()

    if (error) {
      console.error('Supabase delete error:', error)
      if (error.code === 'PGRST116') {
        return errorResponse('Call not found', 404)
      }
      return errorResponse(`Database error: ${error.message}`, 500)
    }

    console.log('Call deleted successfully:', { callId })

    return successResponse({
      success: true,
      message: 'Call deleted successfully',
      deletedCall: data
    }, 200, corsHeaders)

  } catch (error) {
    console.error('Delete call error:', error)
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new Response(null, { status: 200, headers: corsHeaders })
}