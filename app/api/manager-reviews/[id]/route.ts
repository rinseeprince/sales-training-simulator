import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id
    const body = await request.json()
    const { status, manager_feedback, score_override } = body

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

    // Verify the review belongs to this manager (unless admin)
    if (simpleUser.role === 'manager') {
      const { data: review, error: reviewError } = await supabase
        .from('call_reviews')
        .select('reviewer_id')
        .eq('id', reviewId)
        .single()

      if (reviewError || !review) {
        return NextResponse.json({ error: 'Review not found' }, { status: 404 })
      }

      if (review.reviewer_id !== simpleUser.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    // Update the review
    const updateData: any = {
      status,
      reviewed_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    if (manager_feedback !== undefined) {
      updateData.manager_feedback = manager_feedback
    }

    if (score_override !== undefined) {
      updateData.score_override = score_override
    }

    const { data: updatedReview, error: updateError } = await supabase
      .from('call_reviews')
      .update(updateData)
      .eq('id', reviewId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating review:', updateError)
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
    }

    // Update assignment completion status if there's an assignment
    if (updatedReview.assignment_id) {
      const assignmentUpdateData: any = {
        review_status: status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: simpleUser.id
      }

      if (manager_feedback) {
        assignmentUpdateData.reviewer_notes = manager_feedback
      }

      // Update assignment status based on review status
      if (status === 'approved') {
        assignmentUpdateData.status = 'approved'
      } else if (status === 'rejected' || status === 'needs_improvement') {
        assignmentUpdateData.status = 'completed' // Keep as completed but with review notes
      }

      await supabase
        .from('assignment_completions')
        .update(assignmentUpdateData)
        .eq('assignment_id', updatedReview.assignment_id)
    }

    return NextResponse.json({
      success: true,
      review: updatedReview
    })

  } catch (error) {
    console.error('Error in manager-reviews PATCH:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}