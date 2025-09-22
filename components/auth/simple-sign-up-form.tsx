'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabaseAuth } from '@/components/supabase-auth-provider';
import { validateBusinessEmail } from '@/lib/email-validation';

interface SimpleSignUpFormProps {
  onSuccess?: () => void;
}

export function SimpleSignUpForm({ onSuccess }: SimpleSignUpFormProps) {
  const { signUp } = useSupabaseAuth();
  
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

    console.log('Form submitted with:', { email: formData.email, name: formData.name });

    // Validate business email
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

    try {
      const result = await signUp(formData.email, formData.password, formData.name);
      
      console.log('Signup result:', result);
      
      if (result.success) {
        setSuccess(true);
        // Call onSuccess callback if provided for modal closing
        if (onSuccess) {
          onSuccess();
        }
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-600">
            Account Created!
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              We&apos;ve sent a verification email to <strong>{formData.email}</strong>. 
              Please check your email and click the verification link.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Link href="/auth/signin" className="w-full">
            <Button className="w-full">Go to Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Create account</CardTitle>
        <CardDescription>Get started with Sales Training Simulator</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

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

          <div className="space-y-2">
            <Label htmlFor="email">Business Email</Label>
            <div className="relative">
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => {
                  const email = e.target.value;
                  setFormData(prev => ({ ...prev, email }));
                  // Real-time validation
                  if (email.includes('@')) {
                    const validation = validateBusinessEmail(email);
                    setEmailValidation(validation);
                  } else {
                    setEmailValidation(null);
                  }
                }}
                required
                disabled={isLoading}
                className={emailValidation && formData.email ? 
                  emailValidation.isBusinessEmail ? 'pr-10' : 'pr-10 border-red-500' : ''}
                placeholder="you@company.com"
              />
              {emailValidation && formData.email && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {emailValidation.isBusinessEmail ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                </div>
              )}
            </div>
            {emailValidation && !emailValidation.isBusinessEmail && formData.email && (
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
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              'Create account'
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <Link href="/auth/signin" className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
