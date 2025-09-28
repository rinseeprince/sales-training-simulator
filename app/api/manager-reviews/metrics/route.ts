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


    // Try to use the database function, fallback to manual queries if not available
    let metrics = {
      total_calls: 0,
      avg_score: 0,
      pending_reviews: 0,
      approved_calls: 0,
      team_members: 0,
      completion_rate: 0
    }

    // Use manual calculation (more reliable than database function)
    metrics = await getMetricsManually(simpleUser, timeRange, token)

    // Helper function for manual metrics calculation
    async function getMetricsManually(user: any, days: number, authToken: string) {
      const dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - days)

      // Get team members based on domain matching for managers, all for admins
      let teamMembers = []
      
      // Use the auth user's email directly for domain-based team discovery
      const { data: authUserData } = await supabase.auth.getUser(authToken)
      
      if (user.role === 'admin') {
        const { data } = await supabase.from('simple_users').select('id, email, name')
        teamMembers = data || []
      } else if (authUserData?.user?.email) {
        // Use auth user email directly for domain lookup
        const domain = authUserData.user.email.split('@')[1]
        
        const { data, error: teamError } = await supabase
          .from('simple_users')
          .select('id, email, name, role')
          .like('email', `%@${domain}`)
        
        teamMembers = data || []
        
        if (teamError) {
          console.error('Error fetching team members:', teamError)
        }
      }
      
      const teamIds = teamMembers.map(m => m.id)

      // Get calls and assignments for team members
      const { data: calls, error: callsError } = await supabase
        .from('calls')
        .select('score, rep_id, scenario_name, created_at')
        .in('rep_id', teamIds)
        .gte('created_at', dateFilter.toISOString())

      if (callsError) {
        console.error('Error fetching calls:', callsError)
      }

      // Get assignments and completions for completion rate
      const { data: assignments, error: assignmentsError } = await supabase
        .from('scenario_assignments')
        .select(`
          id,
          assigned_to_user,
          created_at,
          assignment_completions (id, completed_at)
        `)
        .in('assigned_to_user', teamIds)
        .gte('created_at', dateFilter.toISOString())

      if (assignmentsError) {
        console.error('Error fetching assignments:', assignmentsError)
      }

      const totalCalls = calls?.length || 0
      const scores = calls?.filter(c => c.score !== null).map(c => c.score) || []
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

      const totalAssignments = assignments?.length || 0
      const completedAssignments = assignments?.filter(a => a.assignment_completions?.length > 0).length || 0
      const completionRate = totalAssignments > 0 ? (completedAssignments / totalAssignments) * 100 : 0

      return {
        total_calls: totalCalls,
        avg_score: avgScore,
        pending_reviews: 0, // Will be calculated separately
        approved_calls: 0,
        team_members: teamIds.length,
        completion_rate: completionRate
      }
    }

    // Get additional metrics not covered by the function
    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - timeRange)

    // Get pending reviews count from assignment_completions for this manager
    let pendingReviewsQuery = supabase
      .from('assignment_completions')
      .select(`
        id,
        scenario_assignments!inner (
          assigned_by
        )
      `)
      .or('review_status.is.null,review_status.eq.pending')
      .gte('completed_at', dateFilter.toISOString())

    // Filter by manager if not admin
    if (simpleUser.role === 'manager') {
      pendingReviewsQuery = pendingReviewsQuery.eq('scenario_assignments.assigned_by', simpleUser.id)
    }

    const { data: pendingReviews, error: pendingError } = await pendingReviewsQuery

    if (pendingError) {
      console.error('Error fetching pending reviews:', pendingError)
    }

    // Get approved calls count
    let approvedCallsQuery = supabase
      .from('assignment_completions')
      .select(`
        id,
        scenario_assignments!inner (
          assigned_by
        )
      `)
      .eq('review_status', 'approved')
      .gte('completed_at', dateFilter.toISOString())

    // Filter by manager if not admin
    if (simpleUser.role === 'manager') {
      approvedCallsQuery = approvedCallsQuery.eq('scenario_assignments.assigned_by', simpleUser.id)
    }

    const { data: approvedCalls, error: approvedError } = await approvedCallsQuery

    if (approvedError) {
      console.error('Error fetching approved calls:', approvedError)
    }

    const processedMetrics = {
      totalCalls: metrics.total_calls || 0,
      avgScore: metrics.avg_score || 0,
      pendingReviews: pendingReviews?.length || 0,
      approvedCalls: approvedCalls?.length || 0,
      teamMembers: metrics.team_members || 0,
      completionRate: metrics.completion_rate || 0
    }

    return NextResponse.json({
      success: true,
      metrics: processedMetrics
    })

  } catch (error) {
    console.error('Error in manager-reviews metrics GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}