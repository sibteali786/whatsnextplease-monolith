// components/settings/ProfileForm/ProfileFormClient.tsx
'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Form } from '@/components/ui/form';
import { Camera, Info, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { trimWhitespace } from '@/utils/utils';
import { clientProfileData, ErrorResponse } from '@wnp/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSecureAvatar } from '@/hooks/useAvatarFromS3';
import { PhoneInput } from '@/components/ui/phone-input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { ClientWithRole, commonProfileSchemaFields, addressSchema, passwordSchema } from './types';
import { PasswordSection, AddressSection, SectionHeader } from './SharedComponents';
import {
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const clientProfileSchema = z.object({
  personalInfo: z.object({
    bio: z.string().optional(),
    contactName: z.string().min(1, 'Contact name is required'),
    companyName: z.string().min(1, 'Company name is required'),
    website: z.union([z.string().url(), z.literal('')]),
    ...commonProfileSchemaFields,
  }),
  password: passwordSchema,
  address: addressSchema,
});

type ClientProfileFormValues = z.infer<typeof clientProfileSchema>;
interface ProfileFormProps {
  initialData: ClientWithRole;
  token: string;
}
export function ProfileFormClient({ initialData, token }: ProfileFormProps) {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [isPersonalEditing, setIsPersonalEditing] = useState(false);
  const [isPasswordEditing, setIsPasswordEditing] = useState(false);
  const [isAddressEditing, setIsAddressEditing] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [originalClient, setOriginalClient] = useState<ClientWithRole | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [showPassword, setShowPassword] = useState(false);

  const { imageUrl, isLoading: isAvatarLoading } = useSecureAvatar(
    avatarFile ? null : initialData.avatarUrl,
    'https://github.com/shadcn.png'
  );

  const form = useForm<ClientProfileFormValues>({
    resolver: zodResolver(clientProfileSchema),
    defaultValues: {
      personalInfo: {
        bio: initialData.bio || '',
        contactName: initialData.contactName ?? '',
        companyName: initialData.companyName,
        website: initialData.website || '',
        email: initialData.email,
        phone: initialData.phone || '',
        username: initialData.username,
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
  });

  useEffect(() => {
    const fetchClientProfile = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/client/profile`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const client: ClientWithRole | ErrorResponse = await response.json();

        if (!response.ok && client instanceof Error) {
          throw new Error(client.message || 'Failed to fetch profile');
        }

        if (client instanceof Object && 'contactName' in client) {
          setOriginalClient(client);
          form.reset({
            personalInfo: {
              bio: client.bio || '',
              contactName: client.contactName ?? '',
              companyName: client.companyName,
              website: client.website || '',
              email: client.email,
              phone: client.phone || '',
              username: client.username,
            },
            password: {
              newPassword: '',
              confirmPassword: '',
            },
            address: {
              country: client.country || '',
              city: client.city || '',
              postalCode: client.zipCode || '',
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

    fetchClientProfile();
  }, [form, token]);

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

  const onSubmit = async (data: ClientProfileFormValues) => {
    try {
      if (!originalClient) return;
      const trimmedData = trimWhitespace(data);
      const changes: Partial<z.infer<typeof clientProfileData>> = {};

      // Handle client-specific fields
      if (trimmedData.personalInfo.contactName !== originalClient.contactName) {
        changes.contactName = trimmedData.personalInfo.contactName;
      }
      if (trimmedData.personalInfo.companyName !== originalClient.companyName) {
        changes.companyName = trimmedData.personalInfo.companyName;
      }
      if (trimmedData.personalInfo.website !== originalClient.website) {
        changes.website = trimmedData.personalInfo.website;
      }
      if (trimmedData.personalInfo.email !== originalClient.email) {
        changes.email = trimmedData.personalInfo.email;
      }
      if (trimmedData.personalInfo.bio !== originalClient.bio) {
        changes.bio = trimmedData.personalInfo.bio;
      }
      if (trimmedData.personalInfo.phone !== originalClient.phone) {
        changes.phone = trimmedData.personalInfo.phone;
      }
      if (trimmedData.personalInfo.username !== originalClient.username) {
        changes.username = trimmedData.personalInfo.username;
      }
      if (trimmedData.address.country !== originalClient.country) {
        changes.country = trimmedData.address.country;
      }
      if (trimmedData.address.city !== originalClient.city) {
        changes.city = trimmedData.address.city;
      }
      if (trimmedData.address.postalCode !== originalClient.zipCode) {
        changes.zipCode = trimmedData.address.postalCode;
      }
      if (trimmedData.password.newPassword) {
        changes.passwordHash = trimmedData.password.newPassword;
      }

      if (Object.keys(changes).length === 0 && !avatarFile) {
        toast({
          title: 'No Changes',
          description: 'No changes were made to update',
          variant: 'default',
        });
        return;
      }

      // Handle avatar upload if needed
      if (avatarFile) {
        const formData = new FormData();
        formData.append('file', avatarFile);

        const uploadResponse = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/client/profilePicture`,
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

      // Update profile if there are changes
      if (Object.keys(changes).length > 0) {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/client/profile`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(changes),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to update profile');
        }

        setOriginalClient(prev => (prev ? { ...prev, ...changes } : prev));
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
        <Tooltip>
          <TooltipTrigger asChild>
            <Info className="h-4 w-4 cursor-pointer" />
          </TooltipTrigger>
          <TooltipContent>
            Click on the Edit Icon to start editing that particular section
          </TooltipContent>
        </Tooltip>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <SectionHeader
                title="Personal Information"
                isEditing={isPersonalEditing}
                onEditToggle={() => setIsPersonalEditing(!isPersonalEditing)}
              />
            </CardHeader>
            <CardContent className="grid gap-6">
              {/* Avatar Section */}
              <div className="flex flex-row gap-4">
                <div className="relative inline-block">
                  <Avatar
                    className={`h-24 w-24 ${isPersonalEditing ? 'cursor-pointer' : 'cursor-not-allowed'}`}
                    onClick={handleAvatarClick}
                  >
                    <AvatarImage
                      src={avatarFile ? URL.createObjectURL(avatarFile) : imageUrl}
                      alt={`${initialData.contactName}'s avatar`}
                      className="object-cover"
                    />
                    <AvatarFallback className="text-2xl">
                      {isAvatarLoading ? (
                        <span className="animate-pulse">...</span>
                      ) : (
                        initialData.contactName?.substring(0, 2).toUpperCase()
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
                  <p className=" text-xl font-bold">{initialData.contactName}</p>
                  <p className="text-muted-foreground">{initialData.companyName}</p>
                  <p className="text-muted-foreground text-sm">
                    {initialData?.city && initialData?.country
                      ? `${initialData.city}, ${initialData.country}`
                      : ''}
                  </p>
                </div>
              </div>

              {/* Form Fields */}
              <FormField
                control={form.control}
                name="personalInfo.bio"
                disabled={!isPersonalEditing}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>BIO</FormLabel>
                    <FormControl>
                      <Textarea {...field} readOnly={!isPersonalEditing} rows={6} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="personalInfo.contactName"
                  disabled={!isPersonalEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CONTACT NAME</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isPersonalEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personalInfo.companyName"
                  disabled={!isPersonalEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>COMPANY NAME</FormLabel>
                      <FormControl>
                        <Input {...field} readOnly={!isPersonalEditing} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="personalInfo.website"
                  disabled={!isPersonalEditing}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>WEBSITE</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          type="url"
                          readOnly={!isPersonalEditing}
                          value={field.value ?? ''}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
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
          {/* Password Section */}
          <PasswordSection
            form={form}
            isEditing={isPasswordEditing}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            passwordStrength={passwordStrength}
            onStrengthChange={setPasswordStrength}
          />

          {/* Address Section */}
          <AddressSection
            form={form}
            isEditing={isAddressEditing}
            onEditToggle={() => setIsAddressEditing(!isAddressEditing)}
          />

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
