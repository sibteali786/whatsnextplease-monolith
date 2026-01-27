import { UserGroup } from '@HillCountryCoder/auth-client';
import { Roles } from '@prisma/client';

export interface CreateUserRequest {
  username: string;
  email: string;
  firstName?: string;
  lastName?: string;
  password?: string;
  groups: UserGroup[];
}

export interface CreateUserResponse {
  success: boolean;
  sub?: string; // The IDP user ID (cognitoSub)
  error?: string;
}

export interface IIdpAdminService {
  /**
   * Create a user in the IDP (Keycloak or Cognito)
   */
  createUser(request: CreateUserRequest): Promise<CreateUserResponse>;

  /**
   * Delete a user from the IDP
   */
  deleteUser(sub: string): Promise<{ success: boolean; error?: string }>;

  /**
   * Check if a user exists in the IDP
   */
  userExists(username: string): Promise<boolean>;

  /**
   * Map application role to IDP group
   */
  mapRoleToGroup(role: Roles): UserGroup;
}
