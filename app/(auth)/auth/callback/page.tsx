'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const handleCallback = async () => {
      const code = searchParams.get('code');
      const next = searchParams.get('next') || '/dashboard';
      
      // Check for errors in hash fragment (client-side only)
      const hash = window.location.hash;
      let error = null;
      let errorDescription = null;
      
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        error = hashParams.get('error');
        errorDescription = hashParams.get('error_description');
      }

      console.log('Client-side callback handling:', {
        code: code ? 'present' : 'missing',
        next,
        error,
        errorDescription,
        hash
      });

      if (error) {
        // Handle specific error cases
        if (error === 'access_denied' && errorDescription?.includes('expired')) {
          // Link expired - redirect to signin with a helpful message
          console.log('Link expired, redirecting to signin');
          router.push('/auth/signin?message=verification_expired');
          return;
        }
        
        // For other errors, redirect to error page
        const errorUrl = `/auth/auth-code-error?error=${encodeURIComponent(error)}&error_description=${encodeURIComponent(errorDescription || 'Unknown error')}`;
        console.log('Redirecting to error page:', errorUrl);
        router.push(errorUrl);
        return;
      }

      // Check if user is already authenticated (Supabase might have already processed the verification)
      const { supabaseClient } = await import('@/lib/supabase-auth');
      const { data: { user } } = await supabaseClient.auth.getUser();
      
      console.log('Current user:', user?.email);

      if (user) {
        // User is already authenticated, update email verification status
        console.log('User already authenticated, updating email verification status');
        try {
          await fetch('/api/update-email-verified', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              authUserId: user.id,
            }),
          });
        } catch (err) {
          console.warn('Failed to update email verification status:', err);
        }
        
        console.log('Redirecting to:', next);
        router.push(next);
        return;
      }

      if (code) {
        // Handle the verification code directly
        try {
          const { data, error } = await supabaseClient.auth.exchangeCodeForSession(code);
          
          console.log('Code exchange result:', { success: !error, error: error?.message });
          
          if (!error && data?.user) {
            // Successful verification - update email verification status
            console.log('Verification successful, updating email verification status');
            try {
              await fetch('/api/update-email-verified', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  authUserId: data.user.id,
                }),
              });
            } catch (err) {
              console.warn('Failed to update email verification status:', err);
            }
            
            console.log('Redirecting to:', next);
            router.push(next);
          } else {
            console.error('Code exchange error:', error);
            router.push('/auth/auth-code-error?error=verification_failed&error_description=' + encodeURIComponent(error?.message || 'Verification failed'));
          }
        } catch (err) {
          console.error('Verification error:', err);
          router.push('/auth/auth-code-error?error=verification_failed&error_description=Failed to process verification');
        }
      } else {
        // No code provided and no user authenticated
        router.push('/auth/auth-code-error?error=no_code&error_description=No verification code provided');
      }
    };

    handleCallback();
  }, [router, searchParams]);

  return (
          <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
        <p className="text-gray-600">Processing verification...</p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <div className="text-gray-600">Loading...</div>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
