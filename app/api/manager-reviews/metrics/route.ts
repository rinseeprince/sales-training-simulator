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

    try {
      const { data: metricsData, error: metricsError } = await supabase
        .rpc('get_team_performance_metrics', {
          manager_id: simpleUser.id,
          days_back: timeRange
        })

      if (metricsError) {
        console.warn('Database function not available, using fallback queries:', metricsError)
        // Fallback to manual queries
        metrics = await getMetricsManually(simpleUser, timeRange)
      } else {
        metrics = metricsData?.[0] || metrics
      }
    } catch (error) {
      console.warn('Database function failed, using fallback queries:', error)
      // Fallback to manual queries
      metrics = await getMetricsManually(simpleUser, timeRange)
    }

    // Helper function for manual metrics calculation
    async function getMetricsManually(user: any, days: number) {
      const dateFilter = new Date()
      dateFilter.setDate(dateFilter.getDate() - days)

      // Get team members based on domain matching for managers, all for admins
      let teamMembers = []
      if (user.role === 'admin') {
        const { data } = await supabase.from('simple_users').select('id')
        teamMembers = data || []
      } else {
        // For managers, get users with the same email domain
        const { data: userProfile } = await supabase
          .from('simple_users')
          .select('email')
          .eq('id', user.id)
          .single()
        
        if (userProfile?.email) {
          const domain = userProfile.email.split('@')[1]
          const { data } = await supabase
            .from('simple_users')
            .select('id')
            .like('email', `%@${domain}`)
          teamMembers = data || []
        }
      }
      
      const teamIds = teamMembers.map(m => m.id)

      // Get calls and assignments for team members
      const { data: calls } = await supabase
        .from('calls')
        .select('score, rep_id')
        .in('rep_id', teamIds)
        .gte('created_at', dateFilter.toISOString())

      // Get assignments and completions for completion rate
      const { data: assignments } = await supabase
        .from('scenario_assignments')
        .select(`
          id,
          assigned_to_user,
          assignment_completions (id)
        `)
        .in('assigned_to_user', teamIds)
        .gte('created_at', dateFilter.toISOString())

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