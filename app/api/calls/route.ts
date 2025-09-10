import { NextRequest } from 'next/server'
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils'
import { authenticateWithRBAC } from '@/lib/rbac-middleware'

export async function GET(request: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(request)
    if (corsResponse) return corsResponse

    // Validate environment variables
    validateEnvVars()

    // Authenticate user with RBAC
    const authUser = await authenticateWithRBAC(request)
    
    const { searchParams } = new URL(request.url)
    const callId = searchParams.get('callId')
    const userId = searchParams.get('userId')
    const scope = searchParams.get('scope') || 'my' // 'my' or 'all' (for managers)
    const repId = searchParams.get('repId') // For managers to filter by specific rep
    const teamId = searchParams.get('teamId') // For managers to filter by team
    const status = searchParams.get('status') // Filter by review status
    const certified = searchParams.get('certified') // Filter by certification status

    console.log('Calls API request:', { 
      callId, 
      userId,
      scope,
      authUser: authUser?.user?.id,
      isManager: authUser?.isManager,
      url: request.url, 
      method: request.method
    })

    // If no callId provided, fetch calls based on scope
    if (!callId) {
      let query = supabase
        .from('calls')
        .select(`
          *, 
          enhanced_scoring,
          rep:simple_users!rep_id(id, name, email),
          reviewer:simple_users!reviewed_by(id, name, email),
          assignment:scenario_assignments!scenario_assignment_id(
            id, 
            status, 
            deadline,
            scenario:scenarios!scenario_id(title)
          )
        `)
        .order('created_at', { ascending: false })

      // Apply scope-based filtering
      if (scope === 'all' && authUser?.isManager) {
        // Managers can see all calls
        
        // Apply optional filters
        if (repId) {
          query = query.eq('rep_id', repId)
        }
        
        if (teamId) {
          // Filter by team members - need to fetch team members first
          const { data: teamMembers } = await supabase
            .from('simple_users')
            .select('id')
            .eq('team_id', teamId)
          
          if (teamMembers && teamMembers.length > 0) {
            const memberIds = teamMembers.map(m => m.id)
            query = query.in('rep_id', memberIds)
          }
        }
      } else {
        // Regular users or 'my' scope - only see their own calls
        const targetUserId = authUser?.user?.id || userId
        if (!targetUserId) {
          return errorResponse('User ID is required', 400)
        }
        query = query.eq('rep_id', targetUserId)
      }

      // Apply status filters
      if (status) {
        query = query.eq('status', status)
      }
      
      if (certified === 'true') {
        query = query.eq('certified', true)
      } else if (certified === 'false') {
        query = query.eq('certified', false)
      }

      const { data: calls, error } = await query

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
    let query = supabase
      .from('calls')
      .select(`
        *, 
        enhanced_scoring,
        rep:simple_users!rep_id(id, name, email),
        reviewer:simple_users!reviewed_by(id, name, email),
        assignment:scenario_assignments!scenario_assignment_id(
          id, 
          status, 
          deadline,
          scenario:scenarios!scenario_id(title)
        )
      `)
      .eq('id', callId)

    const { data: call, error } = await query.single()

    if (error) {
      console.error('Supabase fetch error:', error)
      if (error.code === 'PGRST116') {
        return errorResponse('Call not found', 404)
      }
      return errorResponse(`Database error: ${error.message}`, 500)
    }

    // Check if user has permission to view this call
    if (!authUser?.isManager && call.rep_id !== authUser?.user?.id) {
      return errorResponse('Forbidden', 403)
    }

    console.log('Fetched call data:', {
      id: call.id,
      audio_url: call.audio_url,
      hasAudioUrl: !!call.audio_url,
      enhanced_scoring: call.enhanced_scoring ? 'PRESENT' : 'MISSING',
      status: call.status,
      certified: call.certified
    });

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