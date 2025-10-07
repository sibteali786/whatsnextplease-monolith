'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { registerSchema } from '@/utils/validationSchemas';
import { registerUser } from '@/actions/auth';
import PasswordStrengthMeter from './PasswordStrengthMeter';
import { getPasswordStrength, transformEnumValue, trimWhitespace } from '@/utils/utils';
import { z } from 'zod';
import { useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Loader2, Eye, EyeOff } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { useLoggedInUserState } from '@/store/useUserStore';
import { Roles } from '@prisma/client';
import { useToast } from '@/hooks/use-toast';
import { LoadingOverlay } from './LoadingOverlay';

const SignupForm = () => {
  const router = useRouter();
  const { setUser } = useLoggedInUserState();
  const { toast } = useToast();
  const form = useForm<z.infer<typeof registerSchema>>({
    resolver: zodResolver(registerSchema),
    mode: 'onSubmit',
  });

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const onSubmit = async (data: z.infer<typeof registerSchema>) => {
    try {
      // Show loading toast
      toast({
        title: 'Creating Account',
        description: 'Setting up your account...',
      });

      const trimmedData = trimWhitespace(data);
      const formData = new FormData();
      if (trimmedData.role === Roles.CLIENT) {
        formData.append('companyName', trimmedData.companyName ?? '');
        formData.append('contactName', trimmedData.contactName ?? '');
      } else {
        formData.append('firstName', trimmedData.firstName ?? '');
        formData.append('lastName', trimmedData.lastName ?? '');
      }
      formData.append('email', trimmedData.email);
      formData.append('username', trimmedData.username);
      formData.append('password', trimmedData.password);
      formData.append('role', trimmedData.role);

      const response = await registerUser(formData);

      // ✅ FIXED: Handle success even if email was blocked
      if (response && response.success) {
        if (response.user) {
          setUser(response.user);
        }

        // NEW: Different toast based on whether email was blocked
        if (response.emailBlocked) {
          toast({
            title: 'Account Created! ✓',
            description:
              'Welcome! Note: Email verification is disabled in staging mode. Your account is ready to use.',
            variant: 'default', // NOT destructive - account creation succeeded!
          });
        } else {
          toast({
            title: 'Success! ✓',
            description: 'Account created! Please check your email to verify your account.',
            variant: 'success',
          });
        }

        // Show navigation overlay and redirect
        setIsNavigating(true);
        setTimeout(() => router.push('/home'), 500);
      } else if (response && response.message && !response.success) {
        // This is an actual error (email already exists, validation failed, etc.)
        form.setError('root', { message: response.message });
        toast({
          title: 'Registration Failed',
          description: response.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Failed to sign up:', error);
      form.setError('root', {
        message: error instanceof Error ? error.message : 'Failed to sign up',
      });
      toast({
        title: 'Error',
        description: 'An unexpected error occurred during registration',
        variant: 'destructive',
      });
    }
  };

  const handlePasswordChange = (value: string) => {
    setPasswordStrength(getPasswordStrength(value));
  };

  // Watch the role field for changes
  const role = form.watch('role');
  const pathname = usePathname();
  const isSignUp = pathname.includes('signup');

  return (
    <>
      {isNavigating && <LoadingOverlay message="Setting up your account..." />}
      <div className="w-full max-w-[600px] mx-auto flex-grow border border-default-100 shadow-lg rounded-lg">
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="bg-content1 flex flex-col gap-6 p-6"
          >
            <h1 className="text-3xl font-bold">{isSignUp && 'Sign Up'}</h1>
            {/* Role */}
            <FormField
              control={form.control}
              name="role"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Role*</FormLabel>
                  <FormControl>
                    <Select
                      onValueChange={e => field.onChange(e)}
                      defaultValue={field.value}
                      {...field}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Choose a role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(Roles).map(([key, value]) => (
                          <SelectItem key={key} value={key}>
                            {transformEnumValue(value)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormControl>
                  <FormMessage />
                  <FormDescription>
                    Please specify a role before filling other fields
                  </FormDescription>
                </FormItem>
              )}
            />
            {/* First Name & Last Name or Company Name & Contact Name based on role */}
            {role !== Roles.CLIENT ? (
              <div className="flex gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem className="w-1/2">
                      <FormLabel>First Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="First Name" autoComplete="firstName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem className="w-1/2">
                      <FormLabel>Last Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Last Name" autoComplete="lastName" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <>
                <FormField
                  control={form.control}
                  name="companyName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Company Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Company Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="contactName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Contact Name*</FormLabel>
                      <FormControl>
                        <Input placeholder="Contact Name" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </>
            )}

            {/* Email Address */}
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Address*</FormLabel>
                  <FormControl>
                    <Input placeholder="Email Address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Username */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username*</FormLabel>
                  <FormControl>
                    <Input placeholder="Username" autoComplete="username" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Password with Toggle */}
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <div className="relative">
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Password"
                        autoComplete="new-password"
                        {...field}
                        onChange={e => {
                          field.onChange(e);
                          handlePasswordChange(e.target.value);
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                      >
                        {showPassword ? (
                          <EyeOff className="w-5 h-5" />
                        ) : (
                          <Eye className="w-5 h-5" />
                        )}
                      </button>
                    </div>
                  </FormControl>
                  <FormMessage />
                  <div className="mt-2">
                    <PasswordStrengthMeter strength={passwordStrength} />
                  </div>
                </FormItem>
              )}
            />

            <Button
              type="submit"
              className="mt-4"
              disabled={form.formState.isSubmitting || isNavigating}
            >
              {form.formState.isSubmitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="animate-spin h-4 w-4" />
                  <span>Creating account...</span>
                </div>
              ) : (
                'CREATE ACCOUNT'
              )}
            </Button>

            {form.formState.errors.root && (
              <p className="text-red-500 text-center">{form.formState.errors.root.message}</p>
            )}
          </form>
        </Form>
      </div>
    </>
  );
};

export default SignupForm;
