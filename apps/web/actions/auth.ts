'use server';
import { signin, signup } from '@/utils/authTools';
import { COOKIE_NAME } from '@/utils/constant';
import { registerSchema, signInSchema } from '@/utils/validationSchemas';
import { Roles } from '@prisma/client';
import { cookies } from 'next/headers';

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
    const { token, error, message, user, emailBlocked } = await signup(validatedData);

    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }

    // Set authentication token
    cookies().set(COOKIE_NAME, token);

    return { success: true, message, user, emailBlocked };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: 'An unexpected error occurred while signing you up',
    };
  }
};

export const signinUser = async (formData: FormData) => {
  const data = signInSchema.parse({
    username: formData.get('username'),
    password: formData.get('password'),
  });

  try {
    const { token, user, client, error, message } = await signin(data);
    if (error) {
      console.error(error);
      return { success: false, message: error.message };
    }
    cookies().set(COOKIE_NAME, token);
    if (user) {
      return { success: true, message, user };
    }
    return { success: true, message, client };
  } catch (e) {
    console.error(e);
    return {
      success: false,
      message: 'An unexpected error occurred while signing you in',
    };
  }
};
