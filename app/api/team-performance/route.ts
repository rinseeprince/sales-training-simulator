import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const timeRange = parseInt(searchParams.get('timeRange') || '30')
    
    // Get user from headers
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the simple_users record
    const { data: simpleUser, error: userError } = await supabase
      .from('simple_users')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (userError || !simpleUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if user is manager or admin
    if (!['manager', 'admin'].includes(simpleUser.role)) {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - timeRange)

    // Get team members based on role
    let teamMembersQuery = supabase
      .from('simple_users')
      .select('id, name, email, created_at')

    if (simpleUser.role === 'manager') {
      teamMembersQuery = teamMembersQuery.eq('manager_id', simpleUser.id)
    }
    // Admin sees all users

    const { data: teamMembers, error: teamError } = await teamMembersQuery

    if (teamError) {
      console.error('Error fetching team members:', teamError)
      return NextResponse.json({ error: 'Failed to fetch team members' }, { status: 500 })
    }

    // Get performance data for each team member
    const membersWithPerformance = await Promise.all(
      (teamMembers || []).map(async (member) => {
        // Get calls data
        const { data: calls, error: callsError } = await supabase
          .from('calls')
          .select('id, score, created_at')
          .eq('rep_id', member.id)
          .gte('created_at', dateFilter.toISOString())

        if (callsError) {
          console.error('Error fetching calls for member:', member.id, callsError)
        }

        // Get pending reviews
        const { data: pendingReviews, error: reviewsError } = await supabase
          .from('call_reviews')
          .select('id')
          .eq('call_id', calls?.map(c => c.id) || [])
          .eq('status', 'pending')

        if (reviewsError) {
          console.error('Error fetching pending reviews for member:', member.id, reviewsError)
        }

        // Get assignments and completions
        const { data: assignments, error: assignmentsError } = await supabase
          .from('scenario_assignments')
          .select(`
            id,
            created_at,
            assignment_completions(id, completed_at)
          `)
          .eq('assigned_to_user', member.id)
          .gte('created_at', dateFilter.toISOString())

        if (assignmentsError) {
          console.error('Error fetching assignments for member:', member.id, assignmentsError)
        }

        const totalCalls = calls?.length || 0
        const scores = calls?.filter(c => c.score !== null).map(c => c.score) || []
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0
        
        const totalAssignments = assignments?.length || 0
        const completedAssignments = assignments?.filter(a => a.assignment_completions?.length > 0).length || 0
        const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0

        // Get last activity date
        const lastCallDate = calls?.length > 0 ? 
          Math.max(...calls.map(c => new Date(c.created_at).getTime())) : 
          new Date(member.created_at).getTime()

        return {
          id: member.id,
          name: member.name,
          email: member.email,
          totalCalls,
          avgScore: Math.round(avgScore),
          pendingReviews: pendingReviews?.length || 0,
          completionRate: Math.round(completionRate),
          lastActivity: new Date(lastCallDate).toISOString()
        }
      })
    )

    return NextResponse.json({
      success: true,
      members: membersWithPerformance
    })

  } catch (error) {
    console.error('Error in team-performance GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}