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

    // Get the assignment completion record first to verify ownership
    const { data: completion, error: completionError } = await supabase
      .from('assignment_completions')
      .select(`
        id,
        assignment_id,
        scenario_assignments (
          assigned_by
        )
      `)
      .eq('id', reviewId)
      .single()

    if (completionError || !completion) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Verify the assignment belongs to this manager (unless admin)
    if (simpleUser.role === 'manager') {
      if (completion.scenario_assignments?.assigned_by !== simpleUser.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    // Update the assignment completion directly
    const updateData: any = {
      review_status: status,
      reviewed_at: new Date().toISOString(),
      reviewed_by: simpleUser.id
    }

    if (manager_feedback !== undefined) {
      updateData.reviewer_notes = manager_feedback
    }

    if (score_override !== undefined) {
      updateData.score_override = score_override
    }

    const { data: updatedCompletion, error: updateError } = await supabase
      .from('assignment_completions')
      .update(updateData)
      .eq('id', reviewId)
      .select(`
        *,
        calls (
          id,
          scenario_name,
          rep_id
        )
      `)
      .single()

    if (updateError) {
      console.error('Error updating assignment completion:', updateError)
      return NextResponse.json({ error: 'Failed to update review' }, { status: 500 })
    }

    // Notification will be created automatically by database trigger

    return NextResponse.json({
      success: true,
      review: updatedCompletion
    })

  } catch (error) {
    console.error('Error in manager-reviews PATCH:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const reviewId = params.id

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

    // Get the assignment completion record first to verify ownership
    const { data: completion, error: completionError } = await supabase
      .from('assignment_completions')
      .select(`
        id,
        assignment_id,
        scenario_assignments (
          assigned_by
        )
      `)
      .eq('id', reviewId)
      .single()

    if (completionError || !completion) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    // Verify the assignment belongs to this manager (unless admin)
    if (simpleUser.role === 'manager') {
      if (completion.scenario_assignments?.assigned_by !== simpleUser.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
      }
    }

    // Delete the assignment completion record
    const { error: deleteError } = await supabase
      .from('assignment_completions')
      .delete()
      .eq('id', reviewId)

    if (deleteError) {
      console.error('Error deleting assignment completion:', deleteError)
      return NextResponse.json({ error: 'Failed to delete review' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Review deleted successfully'
    })

  } catch (error) {
    console.error('Error in manager-reviews DELETE:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}