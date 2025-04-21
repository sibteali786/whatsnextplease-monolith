import SignupForm from '@/components/SignUpForm';
import { Suspense } from 'react';

const SignupPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignupForm />
    </Suspense>
  );
};
export default SignupPage;
