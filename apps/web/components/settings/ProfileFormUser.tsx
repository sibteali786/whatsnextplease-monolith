'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Camera, Eye, EyeOff, Info, Loader2, Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { getPasswordStrength, transformEnumValue, trimWhitespace } from '@/utils/utils';
import { ErrorResponse, profileData } from '@wnp/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useSecureAvatar } from '@/hooks/useAvatarFromS3';
import PasswordStrengthMeter from '../PasswordStrengthMeter';
import { PhoneInput } from '../ui/phone-input';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import { UserWithRole } from './types';

// Profile update schema
const profileSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    username: z.string().optional(),
    phone: z
      .string()
      .refine(isValidPhoneNumber, { message: 'Invalid phone number' })
      .or(z.literal('')),
    designation: z.string().optional(),
  }),
  password: z
    .object({
      newPassword: z
        .string()
        .optional()
        .refine(
          data => {
            if (!data) return true;
            const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\W_]).{6,20}$/;
            if (data) {
              return passwordRegex.test(data) && data.length >= 6 && data.length <= 20;
            }
          },
          {
            message:
              'Password must be 6-20 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character',
          }
        ),
      confirmPassword: z.string().optional(),
    })
    .refine(
      data => {
        if (!data.newPassword) return true;
        return data.newPassword === data.confirmPassword;
      },
      {
        message: "Passwords don't match or password is not strong enough",
        path: ['confirmPassword'],
      }
    ),
  address: z.object({
    country: z.string().optional(),
    city: z.string().optional(),
    postalCode: z.string().optional(),
  }),
  avatarUrl: z.string().url().optional(),
});
interface ProfileFormProps {
  initialData: UserWithRole;
  token: string;
}
type UserProfileFormValues = z.infer<typeof profileSchema>;
export default function ProfileFormUser({ initialData, token }: ProfileFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isPersonalEditing, setIsPersonalEditing] = useState(false);
  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [isAddressEditing, setIsAddressEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [originalUser, setOriginalUser] = useState<UserWithRole | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { imageUrl, isLoading: isAvatarLoading } = useSecureAvatar(
    avatarFile ? null : initialData.avatarUrl,
    'https://github.com/shadcn.png'
  );
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const handleAvatarClick = () => {
    if (isPersonalEditing) {
      fileInputRef.current?.click();
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  };
  const form = useForm<UserProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      personalInfo: {
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        email: initialData.email,
        username: initialData.username,
        phone: initialData.phone || '',
        designation: initialData.designation || '',
      },
      password: {
        newPassword: '',
        confirmPassword: '',
      },
      address: {
        country: initialData.country || '',
        city: initialData.city || '',
        postalCode: initialData.zipCode || '',
      },
    },
    mode: 'onSubmit',
  });

  // Fetch user profile data
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/profile`, {
          method: 'GET',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const user: UserWithRole | ErrorResponse = await response.json();
        if (!response.ok && user instanceof Error) {
          throw new Error(user.message || 'Failed to fetch profile');
        }

        // Set form default values with fetched data
        if (user instanceof Object && 'firstName' in user) {
          setOriginalUser(user);
          form.reset({
            personalInfo: {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone || '',
              username: user.username,
              designation: user.designation || '',
            },
            password: {
              newPassword: '',
              confirmPassword: '',
            },
            address: {
              country: user.country || '',
              city: user.city || '',
              postalCode: user.zipCode || '',
            },
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to load profile',
          variant: 'destructive',
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [form]);

  const onSubmit = async (data: UserProfileFormValues) => {
    try {
      if (!originalUser) return;
      const trimmedData = trimWhitespace(data);
      // Track what's actually changed
      const changesInOriginalUser: Partial<z.infer<typeof profileData>> = {};

      // Compare personal info
      if (trimmedData.personalInfo.firstName !== originalUser.firstName) {
        changesInOriginalUser.firstName = trimmedData.personalInfo.firstName;
      }
      if (trimmedData.personalInfo.lastName !== originalUser.lastName) {
        changesInOriginalUser.lastName = trimmedData.personalInfo.lastName;
      }
      if (trimmedData.personalInfo.email !== originalUser.email) {
        changesInOriginalUser.email = trimmedData.personalInfo.email;
      }
      if (trimmedData.personalInfo.username !== originalUser.username) {
        changesInOriginalUser.username = trimmedData.personalInfo.username;
      }
      if (trimmedData.personalInfo.designation !== originalUser.designation) {
        changesInOriginalUser.designation = trimmedData.personalInfo.designation;
      }
      if (trimmedData.personalInfo.phone !== originalUser.phone) {
        changesInOriginalUser.phone = trimmedData.personalInfo.phone;
      }

      if (trimmedData.address.country !== originalUser.country) {
        changesInOriginalUser.country = trimmedData.address.country;
      }
      if (trimmedData.address.city !== originalUser.city) {
        changesInOriginalUser.city = trimmedData.address.city;
      }
      if (trimmedData.address.postalCode !== originalUser.zipCode) {
        changesInOriginalUser.zipCode = trimmedData.address.postalCode;
      }

      if (trimmedData.password.newPassword) {
        changesInOriginalUser.passwordHash = trimmedData.password.newPassword;
      }

      if (Object.keys(changesInOriginalUser).length === 0 && !avatarFile) {
        toast({
          title: 'No Changes',
          description: 'No changesInOriginalUser were made to update',
          variant: 'default',
        });
        return;
      }
      if (avatarFile) {
        // First upload the avatar if a new file is selected
        const formData = new FormData();
        formData.append('file', avatarFile);

        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/user/profilePicture`,
          {
            method: 'PATCH',
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error('Failed to upload avatar');
        }
      }
      // Prepare profile update data
      // Only send update request if there are changesInOriginalUser
      if (Object.keys(changesInOriginalUser).length > 0) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/user/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(changesInOriginalUser),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update profile');
        }

        // Update original data with new values
        setOriginalUser(prev => (prev ? { ...prev, ...changesInOriginalUser } : prev));
      }
      toast({
        title: 'Profile Updated',
        description: 'Your profile has been updated successfully',
        variant: 'success',
      });

      // Reset editing states
      setIsPersonalEditing(false);
      setIsPasswordEditing(false);
      setIsAddressEditing(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-start gap-3">
        <h1 className="text-2xl font-semibold">My Profile</h1>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Info className="h-4 w-4 cursor-pointer" />
            </TooltipTrigger>
            <TooltipContent>
              Click on the Edit <Pencil className="w-4 h-4 inline" /> Icon to start editing that
              particular section{' '}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Personal Information</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPersonalEditing(!isPersonalEditing)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="flex flex-row gap-4">
                <div className="relative inline-block">
                  <Avatar
                    className={`h-24 w-24 ${isPersonalEditing ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={handleAvatarClick}
                  >
                    <AvatarImage
                      src={avatarFile ? URL.createObjectURL(avatarFile) : imageUrl}
                      alt={`${initialData.firstName}'s avatar`}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl">
                      {isAvatarLoading ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        initialData.lastName.substring(0, 2).toUpperCase()
                      )}
                    </AvatarFallback>
                  </Avatar>
                  {isPersonalEditing && (
                    <div className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer z-50">
                      <Camera className="h-4 w-4 text-white" />
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                  aria-label="Upload profile picture"
                />
                <div className="space-y-1 mt-3">
                  <p className="text-xl font-bold">
                    {initialData.firstName} {initialData.lastName}
                  </p>
                  <p className="text-muted-foreground">
                    {transformEnumValue(initialData.role.name)}
                  </p>
                  <p className="text-muted-foreground text-sm">
                    {initialData?.city && initialData?.country
                      ? `${initialData.city}, ${initialData?.country}`
                      : ''}
                  </p>
                </div>
              </div>
              {isPersonalEditing && (
                <p className="text-sm text-muted-foreground">
                  Click the avatar to upload a new profile picture, make sure to click on Update
                  Profile to save changes
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personalInfo.firstName"
                  disabled={!isPersonalEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>FIRST NAME</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isPersonalEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personalInfo.lastName"
                  disabled={!isPersonalEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>LAST NAME</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isPersonalEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personalInfo.email"
                  disabled={!isPersonalEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>EMAIL ADDRESS</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" readOnly={!isPersonalEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  disabled={!isPersonalEditing}
                  name="personalInfo.username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>USERNAME</FormLabel>
                      <FormControl>
                        <Input {...field} type="text" readOnly={!isPersonalEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personalInfo.designation"
                  disabled={!isPersonalEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>DESIGNATION</FormLabel>
                      <FormControl>
                        <Input {...field} type="text" readOnly={!isPersonalEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personalInfo.phone"
                  disabled={!isPersonalEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <PhoneInput
                          placeholder="Enter a phone number"
                          defaultCountry="US"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription className="text-left">
                        Update your phone number
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Password Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Password</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsPasswordEditing(!isPasswordEditing)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="password.newPassword"
                  disabled={!isPasswordEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NEW PASSWORD</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input
                            {...field}
                            type={showPassword ? 'text' : 'password'}
                            disabled={!isPasswordEditing}
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
                  name="password.confirmPassword"
                  disabled={!isPasswordEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CONFIRM PASSWORD</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" disabled={!isPasswordEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Address Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Address</CardTitle>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsAddressEditing(!isAddressEditing)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-6">
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="address.country"
                  disabled={!isAddressEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>COUNTRY</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isAddressEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.city"
                  disabled={!isAddressEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CITY/STATE</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isAddressEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="address.postalCode"
                  disabled={!isAddressEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>POSTAL CODE</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isAddressEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Update Profile Button */}
          {(isPersonalEditing || isPasswordEditing || isAddressEditing) && (
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Profile...
                </>
              ) : (
                'Update Profile'
              )}
            </Button>
          )}
        </form>
      </Form>
    </div>
  );
}
