'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Eye, EyeOff, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/components/auth/enhanced-auth-provider';
import { RegisterRequest, PasswordValidation } from '@/types/auth';

// Password validation helper (simplified version of lib/auth validatePassword)
function validatePasswordClient(password: string): PasswordValidation {
  const errors: string[] = [];
  let score = 0;

  if (password.length < 8) {
    errors.push('At least 8 characters long');
  } else {
    score += 1;
  }

  if (!/[A-Z]/.test(password)) {
    errors.push('One uppercase letter');
  } else {
    score += 1;
  }

  if (!/[a-z]/.test(password)) {
    errors.push('One lowercase letter');
  } else {
    score += 1;
  }

  if (!/\d/.test(password)) {
    errors.push('One number');
  } else {
    score += 1;
  }

  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('One special character');
  } else {
    score += 1;
  }

  if (password.length >= 12) score += 1;
  if (password.length >= 16) score += 1;

  let strength: 'weak' | 'medium' | 'strong';
  if (score >= 6) strength = 'strong';
  else if (score >= 4) strength = 'medium';
  else strength = 'weak';

  return {
    isValid: errors.length === 0,
    errors,
    strength,
    score
  };
}

export function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { register } = useAuth();

  const [formData, setFormData] = useState<RegisterRequest>({
    email: '',
    password: '',
    name: '',
    department: 'Sales',
    invitation_token: searchParams.get('token') || undefined
  });

  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<PasswordValidation | null>(null);

  const isInvitation = !!formData.invitation_token;

  // Validate password in real-time
  useEffect(() => {
    if (formData.password) {
      setPasswordValidation(validatePasswordClient(formData.password));
    } else {
      setPasswordValidation(null);
    }
  }, [formData.password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    // Validate passwords match
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    // Validate password strength
    if (passwordValidation && !passwordValidation.isValid) {
      setError(`Password requirements: ${passwordValidation.errors.join(', ')}`);
      setIsLoading(false);
      return;
    }

    try {
      const result = await register(formData);

      if (result.success) {
        setSuccess(true);
      } else {
        setError(result.message || 'Registration failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof RegisterRequest) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({ ...prev, [field]: e.target.value }));
  };

  const getPasswordStrengthColor = () => {
    if (!passwordValidation) return 'bg-gray-200';
    switch (passwordValidation.strength) {
      case 'weak': return 'bg-red-500';
      case 'medium': return 'bg-yellow-500';
      case 'strong': return 'bg-green-500';
      default: return 'bg-gray-200';
    }
  };

  const getPasswordStrengthPercentage = () => {
    if (!passwordValidation) return 0;
    return (passwordValidation.score / 7) * 100;
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-600">
            Account Created Successfully!
          </CardTitle>
          <CardDescription>
            Welcome to Sales Training Simulator
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <Check className="h-4 w-4" />
            <AlertDescription>
              We've sent a verification email to <strong>{formData.email}</strong>. 
              Please check your email and click the verification link to activate your account.
            </AlertDescription>
          </Alert>
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              Didn't receive the email? Check your spam folder or wait a few minutes.
            </p>
          </div>
        </CardContent>
        <CardFooter>
          <Button 
            className="w-full"
            onClick={() => router.push('/auth/signin')}
          >
            Go to Sign In
          </Button>
        </CardFooter>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">
          {isInvitation ? 'Complete Your Registration' : 'Create your account'}
        </CardTitle>
        <CardDescription>
          {isInvitation 
            ? 'You\'ve been invited to join Sales Training Simulator'
            : 'Start improving your sales skills today'
          }
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <X className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {isInvitation && (
            <Alert>
              <Check className="h-4 w-4" />
              <AlertDescription>
                You're registering with an invitation. Your role and permissions will be pre-configured.
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              type="text"
              placeholder="Enter your full name"
              value={formData.name}
              onChange={handleInputChange('name')}
              disabled={isLoading}
              autoComplete="name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange('email')}
              required
              disabled={isLoading}
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Input
              id="department"
              type="text"
              placeholder="e.g., Sales, Marketing"
              value={formData.department}
              onChange={handleInputChange('department')}
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create a strong password"
                value={formData.password}
                onChange={handleInputChange('password')}
                required
                disabled={isLoading}
                autoComplete="new-password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            
            {formData.password && passwordValidation && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span>Password strength</span>
                  <span className="capitalize">{passwordValidation.strength}</span>
                </div>
                <Progress 
                  value={getPasswordStrengthPercentage()} 
                  className="h-2"
                />
                {passwordValidation.errors.length > 0 && (
                  <div className="text-xs text-muted-foreground">
                    <span>Required: </span>
                    {passwordValidation.errors.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="new-password"
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                disabled={isLoading}
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
            {confirmPassword && formData.password !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || (passwordValidation && !passwordValidation.isValid)}
          >
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
            <Link
              href="/auth/signin"
              className="text-primary hover:underline font-medium"
            >
              Sign in
            </Link>
          </div>

          <div className="text-xs text-center text-muted-foreground">
            By creating an account, you agree to our{' '}
            <Link href="/terms" className="underline">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link href="/privacy" className="underline">
              Privacy Policy
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  );
}
