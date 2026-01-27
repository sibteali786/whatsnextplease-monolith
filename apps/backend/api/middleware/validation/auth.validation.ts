import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Roles } from '@prisma/client';

const signinSchema = z.object({
  username: z.string().min(1, 'Username is required').trim(),
  password: z.string().min(1, 'Password is required'),
});

const signupSchema = z
  .object({
    email: z.string().email('Invalid email address').trim(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(100, 'Password too long'),
    username: z
      .string()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username too long')
      .trim(),
    role: z.nativeEnum(Roles, { errorMap: () => ({ message: 'Invalid role' }) }),
    firstName: z.string().optional(),
    lastName: z.string().optional(),
    companyName: z.string().optional(),
    contactName: z.string().optional(),
  })
  .refine(
    data => {
      if (data.role === Roles.CLIENT) {
        return !!data.companyName;
      }
      return !!data.firstName && !!data.lastName;
    },
    {
      message: 'Invalid fields for the specified role',
    }
  );

export const validateSignin = (req: Request, res: Response, next: NextFunction) => {
  try {
    signinSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};

export const validateSignup = (req: Request, res: Response, next: NextFunction) => {
  try {
    signupSchema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: error.errors.map(e => ({ field: e.path.join('.'), message: e.message })),
      });
    }
    next(error);
  }
};
