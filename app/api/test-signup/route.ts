import { NextRequest, NextResponse } from 'next/server';
import { signUpWithEmail } from '@/lib/supabase-auth';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();
    
    console.log('Testing signup with:', { email, name });
    
    const result = await signUpWithEmail(email, password, name);
    
    console.log('Signup result:', result);
    
    return NextResponse.json(result);
    
  } catch (error) {
    console.error('Test signup error:', error);
    return NextResponse.json({ 
      success: false,
      message: 'Test signup failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
