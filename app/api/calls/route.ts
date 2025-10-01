import { NextRequest, NextResponse } from 'next/server'
import { withOrganizationAuth } from '@/lib/organization-middleware'

export const GET = withOrganizationAuth(
  async (request) => {
    try {
      const { searchParams } = new URL(request.url)
      const callId = searchParams.get('callId')
      const includeAssignments = searchParams.get('includeAssignments') === 'true'

      const { createClient } = await import('@supabase/supabase-js')
      const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      )

      // If no callId provided, fetch calls for organization (filtered by role)
      if (!callId) {
        let selectQuery = '*, enhanced_scoring'
        if (includeAssignments) {
          selectQuery += `, assignment_completions(
            id,
            assignment_id,
            review_status,
            reviewer_notes,
            reviewed_at,
            reviewed_by
          )`
        }

        let query = supabase
          .from('calls')
          .select(selectQuery)

        console.log('Calls API: Filtering calls for user:', {
          userId: request.user.id,
          userRole: request.user.role,
          organizationId: request.organization.id,
          userEmail: request.user.email
        });

        // Users see only their own calls, managers/admins see all organization calls
        if (request.user.role === 'user') {
          // For users, show calls that belong to their organization OR calls that don't have organization_id but belong to them (legacy calls)
          query = query
            .eq('rep_id', request.user.id)
            .or(`organization_id.eq.${request.organization.id},organization_id.is.null`)
        } else {
          // For managers/admins, show all organization calls
          query = query.eq('organization_id', request.organization.id)
        }
        
        query = query.order('created_at', { ascending: false })

        const { data: calls, error } = await query

        if (error) {
          console.error('Calls fetch error:', error)
          return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
        }

        console.log('Calls API: Query result:', {
          callsFound: calls?.length || 0,
          calls: calls?.map(call => ({
            id: call.id,
            rep_id: call.rep_id,
            organization_id: call.organization_id,
            scenario_name: call.scenario_name,
            created_at: call.created_at
          })) || []
        });

        return NextResponse.json({
          success: true,
          calls: calls || [],
          total: calls?.length || 0,
          organization: request.organization
        })
      }

      // Fetch specific call by ID within organization
      let query = supabase
        .from('calls')
        .select('*, enhanced_scoring')
        .eq('id', callId)

      // Users can only see their own calls, managers/admins can see all organization calls
      if (request.user.role === 'user') {
        // For users, show calls that belong to their organization OR calls that don't have organization_id but belong to them (legacy calls)
        query = query
          .eq('rep_id', request.user.id)
          .or(`organization_id.eq.${request.organization.id},organization_id.is.null`)
      } else {
        // For managers/admins, only show organization calls
        query = query.eq('organization_id', request.organization.id)
      }

      const { data: call, error } = await query.single()

      if (error) {
        console.error('Call fetch error:', error)
        if (error.code === 'PGRST116') {
          return NextResponse.json({ error: 'Call not found' }, { status: 404 })
        }
        return NextResponse.json({ error: `Database error: ${error.message}` }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        call,
        organization: request.organization
      })

    } catch (error) {
      console.error('Fetch call error:', error)
      return NextResponse.json({ 
        error: error instanceof Error ? error.message : 'Internal server error' 
      }, { status: 500 })
    }
  }
) 