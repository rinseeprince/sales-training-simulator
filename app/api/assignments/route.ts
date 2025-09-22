import { NextRequest, NextResponse } from 'next/server'
import { errorResponse, successResponse, corsHeaders, handleCors, supabase } from '@/lib/api-utils'
import { createClient } from '@supabase/supabase-js'
import { CreateAssignmentsRequestBody, UpdateAssignmentRequestBody, AssignmentData } from '@/lib/types'

// GET: Fetch assignments for a user or by a manager
export async function GET(req: NextRequest) {
  try {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    const { searchParams } = new URL(req.url)
    const userId = searchParams.get('userId')
    const assignedBy = searchParams.get('assignedBy')
    const status = searchParams.get('status')
    const domain = searchParams.get('domain')

    // If domain is provided, fetch users from that domain
    if (domain) {
      try {
        // Create a fresh Supabase client for this request
        const freshSupabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!
        )
        
        const { data: users, error } = await freshSupabase
          .from('simple_users')
          .select('id, email, name, role, department')
          .like('email', `%@${domain}`)
          .order('name')
        
        if (error) {
          console.error('Database error fetching domain users:', error)
          return errorResponse(`Database error: ${error.message}`, 500)
        }
        
        return NextResponse.json({
          success: true,
          users: users || []
        }, {
          status: 200,
          headers: corsHeaders
        })
      } catch (err) {
        console.error('Unexpected error:', err)
        return errorResponse(`Failed to fetch users: ${err}`, 500)
      }
    }

    // Original assignment fetching logic
    if (!userId && !assignedBy) {
      return errorResponse('userId or assignedBy is required', 400)
    }

    let query = supabase
      .from('scenario_assignments')
      .select(`
        *,
        scenario:scenarios(*),
        assigner:simple_users!assigned_by(name, email),
        assignee:simple_users!assigned_to_user(name, email)
      `)

    if (userId) {
      query = query.eq('assigned_to_user', userId)
    }

    if (assignedBy) {
      query = query.eq('assigned_by', assignedBy)
    }

    if (status) {
      query = query.eq('status', status)
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query

    if (error) {
      console.error('Error fetching assignments:', error)
      return errorResponse(`Database error: ${error.message}`, 500)
    }

    return successResponse({
      assignments: data || []
    })
  } catch (error) {
    console.error('Error in GET /api/assignments:', error)
    return errorResponse('Internal server error', 500)
  }
}

// POST: Create new assignments
export async function POST(req: NextRequest) {
  try {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    const body: CreateAssignmentsRequestBody = await req.json()
    
    // Support both formats for flexibility
    const assignments = body.assignments || null
    const { scenarioId, assignedBy, assignedToUsers, deadline } = body

    // If assignments array is provided directly, use it
    if (assignments && Array.isArray(assignments)) {
      // Create a fresh Supabase client
      const freshSupabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )
      
      const { data, error } = await freshSupabase
        .from('scenario_assignments')
        .insert(assignments)
        .select(`
          *,
          scenario:scenarios(*),
          assigner:simple_users!assigned_by(name, email),
          assignee:simple_users!assigned_to_user(name, email)
        `)

      if (error) {
        console.error('Error creating assignments:', error)
        return errorResponse(`Database error: ${error.message}`, 500)
      }

      return NextResponse.json({
        success: true,
        assignments: data || []
      }, {
        status: 201,
        headers: corsHeaders
      })
    }
    
    // Legacy format support
    if (!scenarioId || !assignedBy || !assignedToUsers || !Array.isArray(assignedToUsers)) {
      return errorResponse('Invalid request format', 400)
    }

    // Create assignments for each user
    const legacyAssignments: AssignmentData[] = assignedToUsers.map((userId: string) => ({
      scenario_id: scenarioId,
      assigned_by: assignedBy,
      assigned_to_user: userId,
      deadline: deadline || null,
      status: 'not_started' as const,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }))

    // Create a fresh Supabase client
    const freshSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await freshSupabase
      .from('scenario_assignments')
      .insert(legacyAssignments)
      .select(`
        *,
        scenario:scenarios(*),
        assigner:simple_users!assigned_by(name, email),
        assignee:simple_users!assigned_to_user(name, email)
      `)

    if (error) {
      console.error('Error creating assignments (legacy):', error)
      return errorResponse(`Database error: ${error.message}`, 500)
    }

    return NextResponse.json({
      success: true,
      assignments: data || [],
      count: data?.length || 0
    }, {
      status: 201,
      headers: corsHeaders
    })

  } catch (error) {
    console.error('Create assignments error:', error)
    return errorResponse('Internal server error', 500)
  }
}

// PATCH: Update assignment status
export async function PATCH(req: NextRequest) {
  try {
    const corsResponse = handleCors(req)
    if (corsResponse) return corsResponse

    const body: UpdateAssignmentRequestBody = await req.json()
    const { assignmentId, status, callId, approvedBy } = body

    if (!assignmentId || !status) {
      return errorResponse('assignmentId and status are required', 400)
    }

    const updateData: Partial<AssignmentData & { call_id?: string; approved_by?: string }> = {
      status: status as 'not_started' | 'in_progress' | 'completed' | 'approved',
      updated_at: new Date().toISOString()
    }

    if (callId) {
      updateData.call_id = callId
    }

    if (approvedBy) {
      updateData.approved_by = approvedBy
    }

    const { data, error } = await supabase
      .from('scenario_assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select(`
        *,
        scenario:scenarios(*),
        assigner:simple_users!assigned_by(name, email),
        assignee:simple_users!assigned_to_user(name, email)
      `)
      .single()

    if (error) {
      console.error('Error updating assignment:', error)
      return errorResponse(`Database error: ${error.message}`, 500)
    }

    return successResponse({
      assignment: data
    }, 200, corsHeaders)

  } catch (error) {
    console.error('Update assignment error:', error)
    return errorResponse('Internal server error', 500)
  }
}

export async function OPTIONS(_req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders })
} 