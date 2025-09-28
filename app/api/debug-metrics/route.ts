import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    // Get user from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'No auth header' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Auth failed', details: authError }, { status: 401 })
    }

    // Debug: Check what we can find
    const results = {
      authUser: {
        id: user.id,
        email: user.email
      },
      simpleUsers: null,
      calls: null,
      assignments: null,
      completions: null,
      domain: null,
      teamMembers: null
    }

    // Check simple_users table
    const { data: allUsers, error: usersError } = await supabase
      .from('simple_users')
      .select('id, email, role, auth_user_id')
      .limit(10)
    
    results.simpleUsers = { data: allUsers, error: usersError }

    // Check current user in simple_users
    const { data: currentUser, error: currentUserError } = await supabase
      .from('simple_users')
      .select('id, email, role')
      .eq('auth_user_id', user.id)
      .single()

    results.currentUser = { data: currentUser, error: currentUserError }

    // If we have the user's email, check domain matching
    if (user.email) {
      const domain = user.email.split('@')[1]
      results.domain = domain

      const { data: teamMembers, error: teamError } = await supabase
        .from('simple_users')
        .select('id, email, role')
        .like('email', `%@${domain}`)

      results.teamMembers = { data: teamMembers, error: teamError }

      // If we found team members, check for their calls
      if (teamMembers && teamMembers.length > 0) {
        const teamIds = teamMembers.map(m => m.id)
        
        const { data: calls, error: callsError } = await supabase
          .from('calls')
          .select('id, rep_id, score, created_at')
          .in('rep_id', teamIds)
          .limit(10)

        results.calls = { data: calls, error: callsError }

        // Check assignments
        const { data: assignments, error: assignmentsError } = await supabase
          .from('scenario_assignments')
          .select('id, assigned_to_user, created_at')
          .in('assigned_to_user', teamIds)
          .limit(10)

        results.assignments = { data: assignments, error: assignmentsError }

        // Check assignment completions
        if (assignments && assignments.length > 0) {
          const assignmentIds = assignments.map(a => a.id)
          
          const { data: completions, error: completionsError } = await supabase
            .from('assignment_completions')
            .select('id, assignment_id, completed_at, review_status')
            .in('assignment_id', assignmentIds)
            .limit(10)

          results.completions = { data: completions, error: completionsError }
        }
      }
    }

    return NextResponse.json({
      success: true,
      debug: results
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Internal server error', details: error },
      { status: 500 }
    )
  }
}