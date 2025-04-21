import SignInForm from '@/components/SignInForm';
import { Suspense } from 'react';

const SigninPage = () => {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SignInForm />
    </Suspense>
  );
};
export default SigninPage;
