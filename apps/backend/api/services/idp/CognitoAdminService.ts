import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
  AttributeType,
} from '@aws-sdk/client-cognito-identity-provider';
import { IIdpAdminService, CreateUserRequest, CreateUserResponse } from './IIdpAdminService';
import { UserGroup } from '@HillCountryCoder/auth-client';
import { Roles } from '@prisma/client';
import { logger } from '../../utils/logger';
import { env } from '../../config/environment';

export class CognitoAdminService implements IIdpAdminService {
  private readonly client: CognitoIdentityProviderClient;
  private readonly userPoolId: string;

  constructor() {
    const region = env.AWS_REGION || 'us-east-1';
    this.userPoolId = env.COGNITO_USER_POOL_ID!;

    if (!this.userPoolId) {
      throw new Error('COGNITO_USER_POOL_ID is required');
    }

    this.client = new CognitoIdentityProviderClient({ region });
  }

  async createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      // 1. Create user in Cognito
      const createCommand = new AdminCreateUserCommand({
        UserPoolId: this.userPoolId,
        Username: request.username,
        UserAttributes: [
          { Name: 'email', Value: request.email },
          { Name: 'email_verified', Value: 'true' },
          { Name: 'given_name', Value: request.firstName || '' },
          { Name: 'family_name', Value: request.lastName || '' },
        ],
        MessageAction: 'SUPPRESS', // Dont send welcome email
      });

      const createResponse = await this.client.send(createCommand);
      const sub = createResponse.User?.Attributes?.find(
        (attr: AttributeType) => attr.Name === 'sub'
      )?.Value;

      if (!sub) {
        return { success: false, error: 'Failed to get user sub' };
      }

      // 2. Set permanent password if provided
      if (request.password) {
        const passwordCommand = new AdminSetUserPasswordCommand({
          UserPoolId: this.userPoolId,
          Username: request.username,
          Password: request.password,
          Permanent: true,
        });

        await this.client.send(passwordCommand);
      }
      // 3. Add user to groups
      for (const group of request.groups) {
        await this.assignUserToGroup(request.username, group);
      }

      logger.info(`Created Cognito user: ${request.username} (${sub})`);
      return {
        success: true,
        sub,
      };
    } catch (error) {
      logger.error('Cognito createUser error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async assignUserToGroup(username: string, groupName: UserGroup): Promise<void> {
    try {
      const command = new AdminAddUserToGroupCommand({
        UserPoolId: this.userPoolId,
        Username: username,
        GroupName: groupName,
      });

      await this.client.send(command);
      logger.info(`Assigned user ${username} to group ${groupName}`);
    } catch (error) {
      logger.error(`Failed to assign user to group ${groupName}:`, error);
    }
  }

  async deleteUser(sub: string): Promise<{ success: boolean; error?: string }> {
    try {
      const command = new AdminDeleteUserCommand({
        UserPoolId: this.userPoolId,
        Username: sub,
      });

      await this.client.send(command);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  async userExists(username: string): Promise<boolean> {
    try {
      const command = new ListUsersCommand({
        UserPoolId: this.userPoolId,
        Filter: `username = "${username}"`,
      });

      const response = await this.client.send(command);
      return (response.Users?.length || 0) > 0;
    } catch (error) {
      logger.error('Error checking if user exists:', error);
      return false;
    }
  }

  mapRoleToGroup(role: Roles): UserGroup {
    if (role === Roles.CLIENT) {
      return UserGroup.WnpExternalClients;
    }
    return UserGroup.WnpInternalUsers;
  }
}
