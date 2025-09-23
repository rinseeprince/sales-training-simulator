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
    const userFilter = searchParams.get('user') || 'all'
    
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

    // Get team members for filtering
    let teamMembersQuery = supabase
      .from('simple_users')
      .select('id, name, email')

    if (simpleUser.role === 'manager') {
      teamMembersQuery = teamMembersQuery.eq('manager_id', simpleUser.id)
    }

    const { data: teamMembers } = await teamMembersQuery

    const teamMemberIds = teamMembers?.map(m => m.id) || []
    
    // Apply user filter
    let filteredMemberIds = teamMemberIds
    if (userFilter !== 'all') {
      filteredMemberIds = teamMemberIds.filter(id => id === userFilter)
    }

    // 1. Score Distribution
    const { data: scoreData } = await supabase
      .from('calls')
      .select('score')
      .in('rep_id', filteredMemberIds)
      .gte('created_at', dateFilter.toISOString())
      .not('score', 'is', null)

    const scoreDistribution = [
      { range: '0-20', count: 0 },
      { range: '21-40', count: 0 },
      { range: '41-60', count: 0 },
      { range: '61-80', count: 0 },
      { range: '81-100', count: 0 }
    ]

    scoreData?.forEach(call => {
      const score = call.score
      if (score <= 20) scoreDistribution[0].count++
      else if (score <= 40) scoreDistribution[1].count++
      else if (score <= 60) scoreDistribution[2].count++
      else if (score <= 80) scoreDistribution[3].count++
      else scoreDistribution[4].count++
    })

    // 2. Performance Trend (last 7 days)
    const performanceTrend = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const startOfDay = new Date(date.setHours(0, 0, 0, 0))
      const endOfDay = new Date(date.setHours(23, 59, 59, 999))

      const { data: dailyCalls } = await supabase
        .from('calls')
        .select('score')
        .in('rep_id', filteredMemberIds)
        .gte('created_at', startOfDay.toISOString())
        .lte('created_at', endOfDay.toISOString())
        .not('score', 'is', null)

      const scores = dailyCalls?.map(c => c.score) || []
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

      performanceTrend.push({
        date: startOfDay.toISOString().split('T')[0],
        avgScore: Math.round(avgScore * 100) / 100,
        callCount: dailyCalls?.length || 0
      })
    }

    // 3. Assignment Status Distribution
    const { data: assignmentData } = await supabase
      .from('scenario_assignments')
      .select(`
        status,
        assignment_completions(id, review_status)
      `)
      .in('assigned_to_user', filteredMemberIds)
      .gte('created_at', dateFilter.toISOString())

    const assignmentStatus = [
      { status: 'Not Started', count: 0 },
      { status: 'In Progress', count: 0 },
      { status: 'Completed', count: 0 },
      { status: 'Approved', count: 0 }
    ]

    assignmentData?.forEach(assignment => {
      if (assignment.assignment_completions?.length > 0) {
        const completion = assignment.assignment_completions[0]
        if (completion.review_status === 'approved') {
          assignmentStatus[3].count++
        } else {
          assignmentStatus[2].count++
        }
      } else if (assignment.status === 'in_progress') {
        assignmentStatus[1].count++
      } else {
        assignmentStatus[0].count++
      }
    })

    // 4. Top Performers
    const topPerformers = []
    for (const member of teamMembers?.slice(0, 5) || []) {
      const { data: memberCalls } = await supabase
        .from('calls')
        .select('score')
        .eq('rep_id', member.id)
        .gte('created_at', dateFilter.toISOString())
        .not('score', 'is', null)

      const scores = memberCalls?.map(c => c.score) || []
      const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0

      if (scores.length > 0) {
        topPerformers.push({
          name: member.name,
          avgScore: Math.round(avgScore * 100) / 100,
          callCount: scores.length
        })
      }
    }

    // Sort top performers by average score
    topPerformers.sort((a, b) => b.avgScore - a.avgScore)

    const analytics = {
      scoreDistribution,
      performanceTrend,
      assignmentStatus,
      topPerformers: topPerformers.slice(0, 5)
    }

    return NextResponse.json({
      success: true,
      analytics
    })

  } catch (error) {
    console.error('Error in manager-analytics GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}