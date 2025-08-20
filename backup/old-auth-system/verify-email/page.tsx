'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Loader2, Mail } from 'lucide-react';
import Link from 'next/link';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'idle'>('idle');
  const [message, setMessage] = useState('');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  useEffect(() => {
    if (token && email) {
      verifyEmail(token, email);
    }
  }, [token, email]);

  const verifyEmail = async (token: string, email: string) => {
    setStatus('loading');
    
    try {
      const response = await fetch('/api/simple-auth/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, email }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage(data.message);
      } else {
        setStatus('error');
        setMessage(data.message || 'Verification failed');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred during verification');
    }
  };

  const resendVerification = async () => {
    if (!email) return;
    
    setStatus('loading');
    setMessage('Sending verification email...');
    
    try {
      const response = await fetch('/api/simple-auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus('success');
        setMessage('Verification email sent! Please check your inbox.');
      } else {
        setStatus('error');
        setMessage(data.message || 'Failed to send verification email');
      }
    } catch (error) {
      setStatus('error');
      setMessage('An error occurred while sending verification email');
    }
  };

  if (!token || !email) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
        <Card className="w-full max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Invalid Verification Link</CardTitle>
            <CardDescription>
              The verification link is missing required parameters.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                Please check your email for the correct verification link, or request a new one.
              </AlertDescription>
            </Alert>
            <div className="mt-4 text-center">
              <Link href="/auth/signin">
                <Button variant="outline">Back to Sign In</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            {status === 'loading' && <Loader2 className="h-12 w-12 text-blue-500 animate-spin" />}
            {status === 'success' && <CheckCircle className="h-12 w-12 text-green-500" />}
            {status === 'error' && <XCircle className="h-12 w-12 text-red-500" />}
            {status === 'idle' && <Mail className="h-12 w-12 text-blue-500" />}
          </div>
          <CardTitle className="text-2xl font-bold">
            {status === 'loading' && 'Verifying Email...'}
            {status === 'success' && 'Email Verified!'}
            {status === 'error' && 'Verification Failed'}
            {status === 'idle' && 'Email Verification'}
          </CardTitle>
          <CardDescription>
            {status === 'loading' && 'Please wait while we verify your email address.'}
            {status === 'success' && 'Your email has been successfully verified.'}
            {status === 'error' && 'We couldn\'t verify your email address.'}
            {status === 'idle' && 'Click the verification link in your email.'}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          {message && (
            <Alert variant={status === 'success' ? 'default' : 'destructive'}>
              {status === 'success' ? (
                <CheckCircle className="h-4 w-4" />
              ) : (
                <XCircle className="h-4 w-4" />
              )}
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}

          {status === 'success' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                You can now sign in to your account and start using all features.
              </p>
              <Link href="/auth/signin">
                <Button className="w-full">Sign In to Your Account</Button>
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                The verification link may have expired or is invalid. You can request a new verification email.
              </p>
              <Button 
                onClick={resendVerification} 
                variant="outline" 
                className="w-full"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </Button>
              <Link href="/auth/signin">
                <Button variant="ghost" className="w-full">Back to Sign In</Button>
              </Link>
            </div>
          )}

          {status === 'idle' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                We sent a verification email to <strong>{email}</strong>. 
                Please check your inbox and click the verification link.
              </p>
              <Button 
                onClick={resendVerification} 
                variant="outline" 
                className="w-full"
                disabled={status === 'loading'}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  'Resend Verification Email'
                )}
              </Button>
              <Link href="/auth/signin">
                <Button variant="ghost" className="w-full">Back to Sign In</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
