'use server';
import { COOKIE_NAME } from '@/utils/constant';
import { registerSchema, signInSchema } from '@/utils/validationSchemas';
import { Roles } from '@prisma/client';
import { cookies } from 'next/headers';

const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
export const registerUser = async (formData: FormData) => {
  try {
    // Extract role first to determine dynamic fields
    const role = formData.get('role') as string;

    // Base data object
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = {
      email: formData.get('email'),
      password: formData.get('password'),
      username: formData.get('username'),
      role,
    };

    // Add role-dependent fields
    if (role === Roles.CLIENT) {
      data.companyName = formData.get('companyName');
      data.contactName = formData.get('contactName');
    } else {
      data.firstName = formData.get('firstName');
      data.lastName = formData.get('lastName');
    }

    // Validate data against schema
    const validatedData = registerSchema.parse(data);

    // Perform the signup operation
    const response = await fetch(`${BACKEND_URL}/auth/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedData),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Signup error:', result);
      return {
        success: false,
        message: result.message || 'Failed to create account',
      };
    }

    // Set authentication token in cookie
    if (result.token) {
      cookies().set(COOKIE_NAME, result.token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 12, // 12 hours
      });
    }

    return {
      success: true,
      message: result.message || 'Account created successfully',
      user: result.user,
      client: result.client,
      emailBlocked: result.emailBlocked,
    };
  } catch (e) {
    console.error('Signup error:', e);
    return {
      success: false,
      message: e instanceof Error ? e.message : 'An unexpected error occurred while signing you up',
    };
  }
};

export const signinUser = async (formData: FormData) => {
  try {
    const data = signInSchema.parse({
      username: formData.get('username'),
      password: formData.get('password'),
    });

    // Call backend signin endpoint
    const response = await fetch(`${BACKEND_URL}/auth/signin`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      console.error('Signin error:', result);
      return {
        success: false,
        message: result.message || 'Invalid username or password',
      };
    }

    // Set authentication token in cookie
    if (result.token) {
      cookies().set(COOKIE_NAME, result.token, {
        httpOnly: false,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 12, // 12 hours
      });
    }

    // Check if user was migrated
    let message = result.message || 'Logged in successfully';
    if (result.migrated) {
      message = 'Welcome back! Your account has been upgraded to our new system.';
    } else if (result.usedLegacy) {
      message = 'Logged in successfully (compatibility mode)';
    }

    return {
      success: true,
      message,
      user: result.user,
      client: result.client,
      migrated: result.migrated || false,
      usedLegacy: result.usedLegacy || false,
    };
  } catch (e) {
    console.error('Signin error:', e);
    return {
      success: false,
      message: e instanceof Error ? e.message : 'An unexpected error occurred while signing you in',
    };
  }
};
