import { Roles } from '@prisma/client';
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface UserJwtPayload extends JwtPayload {
  id: string;
  username: string;
  role: Roles;
}

export interface AuthenticatedRequest extends Request {
  user?: UserJwtPayload;
}
