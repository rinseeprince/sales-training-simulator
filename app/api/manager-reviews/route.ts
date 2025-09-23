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

    // Simplified query to avoid complex nested joins that might fail
    let query = supabase
      .from('call_reviews')
      .select(`
        id,
        call_id,
        assignment_id,
        status,
        score_override,
        manager_feedback,
        reviewed_at,
        created_at,
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
        )
      `)

    // Filter by reviewer (manager sees only their reviews, admin sees all)
    if (simpleUser.role === 'manager') {
      query = query.eq('reviewer_id', simpleUser.id)
    }

    // Filter by status if specified
    if (status !== 'all') {
      query = query.eq('status', status)
    }

    const { data: reviews, error: reviewsError } = await query
      .order('created_at', { ascending: false })
      .limit(50)

    if (reviewsError) {
      console.error('Error fetching reviews:', reviewsError)
      // If call_reviews table doesn't exist or query fails, return empty array
      console.log('Returning empty reviews array due to query error')
      return NextResponse.json({
        success: true,
        reviews: []
      })
    }

    // Process the data to flatten the nested user information
    const processedReviews = reviews?.map(review => ({
      ...review,
      rep: review.calls?.simple_users ? {
        id: review.calls.simple_users.id,
        name: review.calls.simple_users.name,
        email: review.calls.simple_users.email
      } : null,
      call: review.calls ? {
        id: review.calls.id,
        scenario_name: review.calls.scenario_name,
        score: review.calls.score,
        duration: review.calls.duration,
        created_at: review.calls.created_at,
        rep_id: review.calls.rep_id
      } : null
    })) || []

    // Filter by search term if provided
    const filteredReviews = search
      ? processedReviews.filter(review => 
          review.call?.scenario_name?.toLowerCase().includes(search.toLowerCase()) ||
          review.rep?.name?.toLowerCase().includes(search.toLowerCase()) ||
          review.rep?.email?.toLowerCase().includes(search.toLowerCase())
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