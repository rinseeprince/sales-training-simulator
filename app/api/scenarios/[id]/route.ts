import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, corsHeaders, handleCors } from '@/lib/api-utils';
import { authenticateUser } from '@/lib/supabase-auth-middleware';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    // Authenticate user
    const authRequest = await authenticateUser(req);
    if (!authRequest) {
      return errorResponse('Unauthorized', 401);
    }

    const { id } = params;
    const body = await req.json();
    const { title, prompt, prospectName, voice } = body;

    // Validate required fields
    if (!title || !prompt) {
      return errorResponse('Title and prompt are required', 400);
    }

    // Check if user owns this scenario
    const { data: existingScenario, error: fetchError } = await supabase
      .from('scenarios')
      .select('user_id')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Supabase fetch error:', fetchError);
      return errorResponse('Scenario not found', 404);
    }

    if (existingScenario.user_id !== authRequest.user.id) {
      return errorResponse('Forbidden - You can only edit your own scenarios', 403);
    }

    // Update the scenario
    const { data, error } = await supabase
      .from('scenarios')
      .update({
        title: title.trim(),
        prompt: prompt.trim(),
        prospect_name: prospectName?.trim() || null,
        voice: voice || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Supabase update error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({ 
      message: 'Scenario updated successfully',
      scenario: data 
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Update scenario error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    const { id } = params;
    
    const { error } = await supabase
      .from('scenarios')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase delete error:', error);
      return errorResponse(`Database error: ${error.message}`, 500);
    }

    return successResponse({ message: 'Scenario deleted successfully' }, 200, corsHeaders);
  } catch (error) {
    console.error('Delete scenario error:', error);
    return errorResponse('Internal server error', 500);
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}