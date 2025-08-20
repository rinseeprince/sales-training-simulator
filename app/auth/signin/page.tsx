import { SimpleSignInForm } from '@/components/auth/simple-sign-in-form';

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ message?: string }>;
}) {
  const params = await searchParams;
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md">
        {params.message === 'verification_expired' && (
          <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              Your verification link has expired. Please sign in with your email and password, or request a new verification email.
            </p>
          </div>
        )}
        <SimpleSignInForm />
      </div>
    </div>
  );
}

export const metadata = {
  title: 'Sign In - Sales Training Simulator',
  description: 'Sign in to your Sales Training Simulator account',
};