import { SimpleSignInForm } from '@/components/auth/simple-sign-in-form';

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <SimpleSignInForm />
    </div>
  );
}

export const metadata = {
  title: 'Sign In - Sales Training Simulator',
  description: 'Sign in to your Sales Training Simulator account',
};