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
import { useEffect, useState, MutableRefObject } from 'react';
import { getCookie, getPasswordStrength } from '@/utils/utils';
import { COOKIE_NAME } from '@/utils/constant';
import PasswordStrengthMeter from '@/components/PasswordStrengthMeter';
import { Separator } from '@/components/ui/separator';
import { Client } from '@/app/(dashboard)/clients/columns';

// ---------------- Schema ----------------
const editClientSchema = z
  .object({
    username: z.string().min(1, 'Username is required'),
    companyName: z.string().min(1, 'Company name is required'),
    contactName: z.string().optional(),
    email: z.string().email('Invalid email address').optional(),
    website: z.string().optional(),
    phone: z.string().optional(),
    address1: z.string().optional(),
    address2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    zipCode: z.string().optional(),
    newPassword: z
      .string()
      .optional()
      .refine(
        val => {
          if (!val || val.trim() === '') return true;
          const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,20}$/;
          return regex.test(val);
        },
        {
          message:
            'Password must be 6-20 characters with uppercase, lowercase, number, and special character',
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
    { message: "Passwords don't match", path: ['confirmPassword'] }
  );

type EditClientFormValues = z.infer<typeof editClientSchema>;

interface EditClientModalProps {
  client: Client;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  modalStateRef: MutableRefObject<boolean>;
}

// ---------------- Password Generator ----------------
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

// ---------------- Component ----------------
export function EditClientModal({
  client,
  isOpen,
  onClose,
  onSuccess,
  modalStateRef,
}: EditClientModalProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    modalStateRef.current = isOpen;
  }, [isOpen, modalStateRef]);
  const form = useForm<EditClientFormValues>({
    resolver: zodResolver(editClientSchema),
    defaultValues: {
      username: client.username || '',
      companyName: client.companyName || '',
      contactName: client.contactName || '',
      email: client.email || '',
      website: client.website || '',
      phone: client.phone || '',
      address1: client.address1 || '',
      address2: client.address2 || '',
      city: client.city || '',
      state: client.state || '',
      zipCode: client.zipCode || '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  const handleGeneratePassword = async () => {
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 300));
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
        description: 'A strong password has been generated and copied to your clipboard.',
        variant: 'success',
      });
    } catch {
      toast({
        title: 'Password Generated',
        description: 'Unable to copy automatically. Please copy manually.',
        variant: 'default',
      });
    }

    setIsGenerating(false);
  };

  const onSubmit = async (data: EditClientFormValues) => {
    setIsSubmitting(true);
    try {
      const changedFields: Partial<EditClientFormValues & { passwordHash?: string }> = {};

      (Object.keys(data) as Array<keyof EditClientFormValues>).forEach(key => {
        if (key === 'newPassword' || key === 'confirmPassword') return;
        if (data[key] !== client[key as keyof Client]) changedFields[key] = data[key];
      });

      if (data.newPassword && data.newPassword.trim() !== '') {
        changedFields.passwordHash = data.newPassword;
      }

      delete changedFields.confirmPassword;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (changedFields as any).newPassword;

      if (Object.keys(changedFields).length === 0) {
        toast({ title: 'No Changes', description: 'No fields were modified.', variant: 'default' });
        onClose();
        return;
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/client/${client.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${getCookie(COOKIE_NAME)}`,
        },
        body: JSON.stringify(changedFields),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to update client');
      }

      toast({
        title: 'Client Updated',
        description: changedFields.passwordHash
          ? 'Client details updated. Password has been changed.'
          : 'Client details updated successfully.',
        variant: 'success',
      });

      await onSuccess();
      onClose();
      form.reset();
    } catch (err) {
      console.error('Error updating client:', err);
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Failed to update client.',
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
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => {
          e.stopPropagation();
        }}
        onPointerDownOutside={e => {
          e.preventDefault();
        }}
        onInteractOutside={e => {
          e.preventDefault();
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Client: {client.companyName}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Basic & Address Info */}
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="companyName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Company Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Contact Name</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website</FormLabel>
                  <FormControl>
                    <Input type="url" {...field} />
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
                  <FormLabel>Phone</FormLabel>
                  <FormControl>
                    <PhoneInput {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address1"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address 1</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address2"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address 2</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-3 gap-4">
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
              <FormField
                control={form.control}
                name="zipCode"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Zip Code</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Password Section - copied from user modal */}
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
                            setPasswordStrength(
                              e.target.value ? getPasswordStrength(e.target.value) : 0
                            );
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
                    {field.value && (
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
              <Button
                type="button"
                variant="outline"
                onClick={e => {
                  e.stopPropagation();
                  onClose();
                }}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : (
                  'Update Client'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
