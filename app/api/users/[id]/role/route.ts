import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function createSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createClient(supabaseUrl, supabaseServiceKey);
}

// GET /api/users/[id]/role - Get user role
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = params.id;
    
    if (!userId) {
      return NextResponse.json({ 
        error: 'User ID is required',
        success: false 
      }, { status: 400 });
    }

    const supabaseAdmin = createSupabaseAdmin();

    // MIGRATION UPDATE: Direct lookup with unified ID
    const { data: userProfile, error } = await supabaseAdmin
      .from('simple_users')
      .select('role')
      .eq('id', userId)
      .single();

    if (error || !userProfile) {
      // Default to 'user' role if not found
      return NextResponse.json({ 
        success: true,
        role: 'user'
      });
    }

    return NextResponse.json({ 
      success: true,
      role: userProfile.role || 'user'
    });

  } catch (error) {
    console.error('Get user role error:', error);
    // Default to 'user' role on error
    return NextResponse.json({ 
      success: true,
      role: 'user'
    });
  }
} 