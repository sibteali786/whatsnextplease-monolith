// components/settings/ProfileForm/types.ts
import { z } from 'zod';
import { isValidPhoneNumber } from 'react-phone-number-input';
import { Client, Roles, User } from '@prisma/client';
import { UserState } from '@/utils/user';

export interface UserWithRole extends Omit<User, 'passwordHash'> {
  role: {
    name: Roles;
  };
}

export interface ClientWithRole extends Omit<Client, 'passwordHash'> {
  role: {
    name: Roles;
  };
}

export interface ProfileFormProps {
  initialData: UserWithRole | ClientWithRole;
  token: string;
  user: UserState;
}

// Common schema parts that both user and client forms share
export const commonProfileSchemaFields = {
  email: z.string().email('Invalid email address'),
  username: z.string().optional(),
  phone: z
    .string()
    .refine(isValidPhoneNumber, { message: 'Invalid phone number' })
    .or(z.literal('')),
};

export const addressSchema = z.object({
  country: z.string().optional(),
  city: z.string().optional(),
  postalCode: z.string().optional(),
});

export const passwordSchema = z
  .object({
    newPassword: z
      .string()
      .optional()
      .refine(
        data => {
          if (!data) return true;
          const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.*[\W_]).{6,20}$/;
          return passwordRegex.test(data);
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
      message: "Passwords don't match",
      path: ['confirmPassword'],
    }
  );
