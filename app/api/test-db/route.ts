import { NextRequest, NextResponse } from 'next/server';
import { supabase, errorResponse, successResponse, validateEnvVars, corsHeaders, handleCors } from '@/lib/api-utils';

export async function GET(req: NextRequest) {
  try {
    // Handle CORS
    const corsResponse = handleCors(req);
    if (corsResponse) return corsResponse;

    console.log('Testing database connection...');
    
    // Check environment variables
    const envVars = {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      hasOpenAIKey: !!process.env.OPENAI_API_KEY,
    };
    
    console.log('Environment variables:', envVars);

    // Validate environment variables
    validateEnvVars();

    // Test Supabase connection by querying users table
    const { data: users, error } = await supabase
      .from('users')
      .select('id, name, email')
      .limit(5);

    if (error) {
      console.error('Supabase connection error:', error);
      return errorResponse(`Database connection failed: ${error.message}`, 500);
    }

    console.log('Database connection successful, found users:', users?.length || 0);

    return successResponse({
      success: true,
      message: 'Database connection successful',
      userCount: users?.length || 0,
      users: users || [],
      envVars
    }, 200, corsHeaders);

  } catch (error) {
    console.error('Test DB error:', error);
    return errorResponse(
      error instanceof Error ? error.message : 'Internal server error',
      500
    );
  }
}

export async function OPTIONS(req: NextRequest) {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
} 