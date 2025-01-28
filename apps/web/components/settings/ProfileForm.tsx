'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Camera, Loader2, Pencil } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { transformEnumValue, trimWhitespace } from '@/utils/utils';
import { Roles, User } from '@prisma/client';
import { ErrorResponse } from '@wnp/types';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { useSecureAvatar } from '@/hooks/useAvatarFromS3';
interface UserWithRole extends Omit<User, 'passwordHash'> {
  role: {
    id: string;
    name: Roles;
  };
}

// Update the ProfileFormProps interface
interface ProfileFormProps {
  initialData: UserWithRole;
  token: string;
}
// Profile update schema
const profileSchema = z.object({
  personalInfo: z.object({
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
    email: z.string().email('Invalid email address'),
    phone: z.string().optional(),
  }),
  password: z
    .object({
      newPassword: z.string().optional(),
      confirmPassword: z.string().optional(),
    })
    .refine(
      data => {
        if (!data.newPassword) return true;

        return data.newPassword === data.confirmPassword;
      },
      {
        message: "Passwords don't match",
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

type ProfileFormValues = z.infer<typeof profileSchema>;
export default function ProfileForm({ initialData, token }: ProfileFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isPersonalEditing, setIsPersonalEditing] = useState(false);
  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [isAddressEditing, setIsAddressEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { imageUrl, isLoading: isAvatarLoading } = useSecureAvatar(
    // Only use S3 URL when no file is selected
    avatarFile ? null : initialData.avatarUrl,
    'https://github.com/shadcn.png'
  );
  // Add these handlers inside your component
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
    }
  };
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      personalInfo: {
        firstName: initialData.firstName,
        lastName: initialData.lastName,
        email: initialData.email,
        phone: initialData.phone || '',
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
          form.reset({
            personalInfo: {
              firstName: user.firstName,
              lastName: user.lastName,
              email: user.email,
              phone: user.phone || '',
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
  }, [form, toast]);

  const onSubmit = async (data: ProfileFormValues) => {
    try {
      const trimmedData = trimWhitespace(data);
      console.log(trimmedData);
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

        // Include new avatar URL in profile update
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">My Profile</h1>
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
                  <Avatar className="h-24 w-24 cursor-pointer" onClick={handleAvatarClick}>
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
                  <div className="absolute bottom-0 right-0 p-1 bg-primary rounded-full cursor-pointer z-50 ">
                    <Camera className="h-4 w-4 text-white" />
                  </div>
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
                      ? initialData.city + ',' + initialData?.country
                      : ''}
                  </p>
                </div>
              </div>
              {isPersonalEditing && (
                <p className="text-sm text-muted-foreground">
                  Click the avatar to upload a new profile picture
                </p>
              )}
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personalInfo.firstName"
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
                  name="personalInfo.phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>PHONE</FormLabel>
                      <FormControl>
                        <Input {...field} type="tel" readOnly={!isPersonalEditing} />
                      </FormControl>
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
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>NEW PASSWORD</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" disabled={!isPasswordEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password.confirmPassword"
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
