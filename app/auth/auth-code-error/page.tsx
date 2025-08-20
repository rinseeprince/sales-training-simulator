import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import Link from 'next/link';

export default function AuthCodeErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-indigo-100 px-4">
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
          </div>
          <CardTitle className="text-2xl font-bold">Authentication Error</CardTitle>
          <CardDescription>
            There was an issue with the authentication process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-600 text-center">
            The authentication link may have expired or is invalid. Please try signing in again.
          </p>
          <div className="flex flex-col space-y-2">
            <Link href="/auth/signin">
              <Button className="w-full">Go to Sign In</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">Go to Home</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
