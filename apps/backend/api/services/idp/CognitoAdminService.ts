import {
  CognitoIdentityProviderClient,
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminAddUserToGroupCommand,
  AdminDeleteUserCommand,
  ListUsersCommand,
  AttributeType,
  AdminUpdateUserAttributesCommand,
  AdminRemoveUserFromGroupCommand,
} from '@aws-sdk/client-cognito-identity-provider';
import {
  IIdpAdminService,
  CreateUserRequest,
  CreateUserResponse,
  UpdateUserResponse,
  UpdateUserRequest,
} from './IIdpAdminService';
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
          ...(request.role ? [{ Name: 'custom:wnp_role', Value: String(request.role) }] : []),
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
      logger.error(`Cognito createUser error: ${error}`);
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

  async updateUser(
    sub: string,
    username: string,
    updates: UpdateUserRequest
  ): Promise<UpdateUserResponse> {
    try {
      const skippedFields: string[] = [];

      // 2. Update standard attributes (email, firstName, lastName)
      const attributes: { Name: string; Value: string }[] = [];
      if (updates.email !== undefined) attributes.push({ Name: 'email', Value: updates.email });
      if (updates.firstName !== undefined)
        attributes.push({ Name: 'given_name', Value: updates.firstName });
      if (updates.lastName !== undefined)
        attributes.push({ Name: 'family_name', Value: updates.lastName });

      if (attributes.length > 0) {
        const command = new AdminUpdateUserAttributesCommand({
          UserPoolId: this.userPoolId,
          Username: username,
          UserAttributes: attributes,
        });
        await this.client.send(command);
        logger.info(`Updated Cognito attributes for user: ${username}`);
      }

      // 3. Update password
      if (updates.password) {
        const command = new AdminSetUserPasswordCommand({
          UserPoolId: this.userPoolId,
          Username: username,
          Password: updates.password,
          Permanent: true,
        });
        await this.client.send(command);
        logger.info(`Updated Cognito password for user: ${username}`);
      }

      // 4. Update group if role changed
      if (updates.role !== undefined) {
        const newGroupName = this.mapRoleToGroup(updates.role);

        // Get current groups
        const { AdminListGroupsForUserCommand } =
          await import('@aws-sdk/client-cognito-identity-provider');
        const listCommand = new AdminListGroupsForUserCommand({
          UserPoolId: this.userPoolId,
          Username: username,
        });
        const currentGroupsResponse = await this.client.send(listCommand);
        const currentGroups = currentGroupsResponse.Groups || [];

        // Remove from existing groups
        for (const group of currentGroups) {
          if (group.GroupName) {
            const removeCommand = new AdminRemoveUserFromGroupCommand({
              UserPoolId: this.userPoolId,
              Username: username,
              GroupName: group.GroupName,
            });
            await this.client.send(removeCommand);
          }
        }

        // Add to new group
        const addCommand = new AdminAddUserToGroupCommand({
          UserPoolId: this.userPoolId,
          Username: username,
          GroupName: newGroupName,
        });
        await this.client.send(addCommand);
        logger.info(`Reassigned Cognito user ${username} to group: ${newGroupName}`);
      }

      return { success: true, skippedFields: skippedFields.length ? skippedFields : undefined };
    } catch (error) {
      logger.error(`Cognito updateUser error for ${sub}:${username}: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
