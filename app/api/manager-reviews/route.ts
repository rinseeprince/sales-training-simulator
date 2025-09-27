import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || 'all'
    const search = searchParams.get('search') || ''
    
    // Get user from headers (assuming auth middleware sets this)
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Extract user ID from auth header or session
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabase.auth.getUser(token)
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get the simple_users record to find manager ID
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

    // Query assignment_completions instead of call_reviews since that's where completed assignments are tracked
    let query = supabase
      .from('assignment_completions')
      .select(`
        id,
        assignment_id,
        call_id,
        completed_by,
        completed_at,
        review_status,
        reviewer_notes,
        reviewed_at,
        reviewed_by,
        calls (
          id,
          scenario_name,
          score,
          duration,
          created_at,
          rep_id,
          simple_users!calls_rep_id_fkey (
            id,
            name,
            email
          )
        ),
        scenario_assignments (
          id,
          scenario_id,
          assigned_by,
          scenarios (
            title
          )
        )
      `)

    // Filter by assigned_by (manager sees only assignments they created, admin sees all)
    if (simpleUser.role === 'manager') {
      query = query.eq('scenario_assignments.assigned_by', simpleUser.id)
    }

    // Filter by review status if specified
    if (status !== 'all') {
      query = query.eq('review_status', status)
    }

    const { data: completions, error: completionsError } = await query
      .order('completed_at', { ascending: false })
      .limit(50)

    if (completionsError) {
      console.error('Error fetching assignment completions:', completionsError)
      return NextResponse.json({
        success: true,
        reviews: []
      })
    }

    // Process the data to match the expected format for the frontend
    const processedReviews = completions?.map(completion => ({
      id: completion.id,
      assignment_id: completion.assignment_id,
      call_id: completion.call_id,
      status: completion.review_status || 'pending',
      manager_feedback: completion.reviewer_notes,
      reviewed_at: completion.reviewed_at,
      created_at: completion.completed_at,
      calls: completion.calls ? {
        id: completion.calls.id,
        scenario_name: completion.calls.scenario_name,
        score: completion.calls.score,
        duration: completion.calls.duration,
        created_at: completion.calls.created_at,
        rep_id: completion.calls.rep_id,
        simple_users: completion.calls.simple_users
      } : null,
      scenario_assignments: completion.scenario_assignments
    })) || []

    // Filter by search term if provided
    const filteredReviews = search
      ? processedReviews.filter(review => 
          review.calls?.scenario_name?.toLowerCase().includes(search.toLowerCase()) ||
          review.calls?.simple_users?.name?.toLowerCase().includes(search.toLowerCase()) ||
          review.calls?.simple_users?.email?.toLowerCase().includes(search.toLowerCase()) ||
          review.scenario_assignments?.scenarios?.title?.toLowerCase().includes(search.toLowerCase())
        )
      : processedReviews

    return NextResponse.json({
      success: true,
      reviews: filteredReviews
    })

  } catch (error) {
    console.error('Error in manager-reviews GET:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}