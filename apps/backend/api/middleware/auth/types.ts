import { UserGroup } from '@HillCountryCoder/auth-client';
import { Roles } from '@prisma/client';
import { Request } from 'express';
import { JwtPayload } from 'jsonwebtoken';

export interface UserJwtPayload extends JwtPayload {
  id: string;
  username: string;
  role: Roles;

  cognitoSub?: string;
  email?: string;
  groups?: UserGroup[];
}

export interface AuthenticatedRequest extends Request {
  user?: UserJwtPayload;
}
