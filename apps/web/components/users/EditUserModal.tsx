'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { PhoneInput } from '@/components/ui/phone-input';
import { useToast } from '@/hooks/use-toast';
import { Eye, EyeOff, Loader2, RefreshCw } from 'lucide-react';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { useState, useEffect, MutableRefObject } from 'react';
import { User } from '@/app/(dashboard)/users/columns';
import { getCookie, getPasswordStrength } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { Separator } from '@/components/ui/separator';

const editUserSchema = z
  .object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z
      .string()
      .optional()
      .refine(
        data => {
          if (!data || data.trim() === '') return true;
          return isValidPhoneNumber(data);
        },
        { message: 'Please enter a valid phone number or leave empty' }
      ),
    address: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    newPassword: z
      .string()
      .optional()
      .refine(
        data => {
          if (!data || data.trim() === '') return true;
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\W_]).{6,20}$/;
          return passwordRegex.test(data) && data.length >= 6 && data.length <= 20;
        },
        {
          message:
            'Password must be 6-20 characters with at least one uppercase, lowercase, number, and special character',
        }
      ),
    confirmPassword: z.string().optional(),
  })
  .refine(
    data => {
      if (data.newPassword && data.newPassword.trim() !== '') {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    {
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }
  );

type EditUserFormValues = z.infer<typeof editUserSchema>;

interface EditUserModalProps {
  user: User;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  modalStateRef: MutableRefObject<boolean>;
}

const generateStrongPassword = (): string => {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const length = 12 + Math.floor(Math.random() * 5);

  let password = '';
  password += lowercase[Math.floor(Math.random() * lowercase.length)];
  password += uppercase[Math.floor(Math.random() * uppercase.length)];
  password += numbers[Math.floor(Math.random() * numbers.length)];
  password += special[Math.floor(Math.random() * special.length)];

  const allChars = lowercase + uppercase + numbers + special;
  for (let i = password.length; i < length; i++) {
    password += allChars[Math.floor(Math.random() * allChars.length)];
  }

  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

export function EditUserModal({
  user,
  isOpen,
  onClose,
  onSuccess,
  modalStateRef,
}: EditUserModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Update modal state when this modal opens/closes
  useEffect(() => {
    modalStateRef.current = isOpen;
  }, [isOpen, modalStateRef]);

  const form = useForm<EditUserFormValues>({
    resolver: zodResolver(editUserSchema),
    defaultValues: {
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone || '',
      address: user.address || '',
      city: user.city || '',
      state: user.state || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleGeneratePassword = async () => {
    setIsGenerating(true);

    await new Promise(resolve => setTimeout(resolve, 300));

    const generatedPassword = generateStrongPassword();

    form.setValue('newPassword', generatedPassword);
    form.setValue('confirmPassword', generatedPassword);

    setPasswordStrength(getPasswordStrength(generatedPassword));

    setShowPassword(true);
    setShowConfirmPassword(true);

    try {
      await navigator.clipboard.writeText(generatedPassword);
      toast({
        title: 'Password Generated & Copied',
        description:
          'A strong password has been generated and copied to your clipboard. Make sure to save it securely and share it with the user.',
        variant: 'success',
      });
    } catch (error) {
      toast({
        title: 'Password Generated',
        description: `A strong password has been generated. Please copy it manually from the field. ${error}`,
        variant: 'default',
      });
    }

    setIsGenerating(false);
  };

  const onSubmit = async (data: EditUserFormValues) => {
    setIsSubmitting(true);
    try {
      const changedFields: Partial<EditUserFormValues & { passwordHash?: string }> = {};

      (Object.keys(data) as Array<keyof EditUserFormValues>).forEach(key => {
        if (key === 'newPassword' || key === 'confirmPassword') return;

        if (data[key] !== user[key]) {
          changedFields[key] = data[key];
        }
      });

      if (data.newPassword && data.newPassword.trim() !== '') {
        changedFields.passwordHash = data.newPassword;
      }

      delete changedFields.confirmPassword;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (changedFields as any).newPassword;

      if (Object.keys(changedFields).length === 0) {
        toast({
          title: 'No Changes',
          description: 'No changes were made to update',
          variant: 'default',
        });
        onClose();
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
        },
        credentials: 'include',
        body: JSON.stringify(changedFields),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to update user');
      }

      toast({
        title: 'Success',
        description: changedFields.passwordHash
          ? 'User updated successfully. Password has been changed. Make sure the user receives their new password securely.'
          : 'User updated successfully',
        variant: 'success',
      });

      await onSuccess();
      onClose();
      form.reset();
    } catch (error) {
      console.error('Error updating user:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update user',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) {
      form.reset();
      setPasswordStrength(0);
      setShowPassword(false);
      setShowConfirmPassword(false);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent
        onClick={e => {
          e.stopPropagation();
        }}
        onPointerDownOutside={e => {
          e.preventDefault();
        }}
        onInteractOutside={e => {
          e.preventDefault();
        }}
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
      >
        <DialogHeader>
          <DialogTitle>
            Edit User: {user.firstName} {user.lastName}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Basic Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="firstName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>First Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="lastName"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Name</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input {...field} type="email" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number</FormLabel>
                    <FormControl>
                      <PhoneInput placeholder="Enter phone number" defaultCountry="US" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Address Information */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Address</h3>
              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Street Address</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="city"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="state"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>State</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Password Change Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-medium">Change Password</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Leave blank to keep current password
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleGeneratePassword}
                  disabled={isGenerating || isSubmitting}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Generate Strong Password'}
                </Button>
              </div>

              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Enter new password (optional)"
                          onChange={e => {
                            field.onChange(e);
                            if (e.target.value) {
                              setPasswordStrength(getPasswordStrength(e.target.value));
                            } else {
                              setPasswordStrength(0);
                            }
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
                    <FormDescription>
                      Must be 6-20 characters with uppercase, lowercase, number, and special
                      character
                    </FormDescription>
                    <FormMessage />
                    {field.value && field.value.trim() !== '' && (
                      <div className="mt-2">
                        <PasswordStrengthMeter strength={passwordStrength} />
                      </div>
                    )}
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input
                          {...field}
                          type={showConfirmPassword ? 'text' : 'password'}
                          placeholder="Confirm new password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500"
                        >
                          {showConfirmPassword ? (
                            <EyeOff className="w-5 h-5" />
                          ) : (
                            <Eye className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update User'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
