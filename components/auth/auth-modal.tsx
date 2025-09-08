'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabaseAuth } from '@/components/supabase-auth-provider';
import { validateBusinessEmail } from '@/lib/email-validation';

interface AuthModalProps {
  onSuccess?: () => void;
}

export function AuthModal({ onSuccess }: AuthModalProps) {
  const router = useRouter();
  const { signUp, signIn } = useSupabaseAuth();
  
  const [isSignUp, setIsSignUp] = useState(true);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: ''
  });
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [emailValidation, setEmailValidation] = useState<{ isValid: boolean; isBusinessEmail: boolean; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isSignUp) {
        // Validate business email for sign-ups
        const emailValidation = validateBusinessEmail(formData.email);
        
        if (!emailValidation.isValid) {
          setError(emailValidation.error || 'Invalid email address');
          setIsLoading(false);
          return;
        }
        
        if (!emailValidation.isBusinessEmail) {
          setError(emailValidation.error || 'Please use your business email address to sign up');
          setIsLoading(false);
          return;
        }
        
        const result = await signUp(formData.email, formData.password, formData.name);
        
        if (result.success) {
          setSuccess(true);
          // Don't call onSuccess for signup - user needs to verify email first
        } else {
          setError(result.message);
        }
      } else {
        const result = await signIn(formData.email, formData.password);
        
        if (result.success) {
          if (onSuccess) {
            onSuccess();
          } else {
            router.push('/dashboard');
          }
        } else {
          setError(result.message);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
    setSuccess(false);
    setFormData({ email: '', password: '', name: '' });
  };

  if (success && isSignUp) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-green-600 mb-2">
            Account Created!
          </h2>
          <p className="text-sm text-muted-foreground">
            We've sent a verification email to <strong>{formData.email}</strong>. 
            Please check your email and click the verification link.
          </p>
        </div>
        <Button 
          onClick={toggleMode} 
          className="w-full"
          variant="outline"
        >
          Go to Sign In
        </Button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold">
          {isSignUp ? 'Create account' : 'Welcome back'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {isSignUp ? 'Get started with Sales Training Simulator' : 'Sign in to your account'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                disabled={isLoading}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  const email = e.target.value;
                  setFormData(prev => ({ ...prev, email }));
                  // Real-time validation for sign-up only
                  if (isSignUp && email.includes('@')) {
                    const validation = validateBusinessEmail(email);
                    setEmailValidation(validation);
                  } else {
                    setEmailValidation(null);
                  }
                }}
                required
                disabled={isLoading}
                className={isSignUp && emailValidation && formData.email ? 
                  emailValidation.isBusinessEmail ? 'pr-10' : 'pr-10 border-red-500' : ''}
              />
              {isSignUp && emailValidation && formData.email && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {emailValidation.isBusinessEmail ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {isSignUp && emailValidation && !emailValidation.isBusinessEmail && formData.email && (
              <p className="text-xs text-red-500 mt-1">
                {emailValidation.error}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                required
                disabled={isLoading}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isSignUp ? 'Creating account...' : 'Signing in...'}
              </>
            ) : (
              isSignUp ? 'Create account' : 'Sign in'
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            {isSignUp ? "Already have an account?" : "Don't have an account?"}{' '}
            <button
              type="button"
              onClick={toggleMode}
              className="text-primary hover:underline font-medium"
            >
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
