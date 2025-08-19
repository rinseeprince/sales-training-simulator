import { SimpleSignUpForm } from '@/components/auth/simple-sign-up-form';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <SimpleSignUpForm />
    </div>
  );
}

export const metadata = {
  title: 'Sign Up - Sales Training Simulator',
  description: 'Create your Sales Training Simulator account',
};