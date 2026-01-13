import { IIdpAdminService, CreateUserRequest, CreateUserResponse } from './IIdpAdminService';
import { UserGroup } from '@HillCountryCoder/auth-client';
import { Roles } from '@prisma/client';
import { logger } from '../../utils/logger';
import { env } from '../../config/environment';
interface KeycloakGroup {
  id: string;
  name: string;
}
export class KeycloakAdminService implements IIdpAdminService {
  private readonly keycloakUrl: string;
  private readonly realm: string;
  private readonly adminUsername: string;
  private readonly adminPassword: string;
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;

  constructor() {
    this.keycloakUrl = env.KEYCLOAK_URL || 'http://localhost:8080';
    this.realm = env.KEYCLOAK_REALM || 'hcc-wnp';
    this.adminUsername = env.KEYCLOAK_ADMIN_USERNAME || 'admin';
    this.adminPassword = env.KEYCLOAK_ADMIN_PASSWORD || 'admin';
  }

  /**
   * Get admin access token (with caching)
   */
  private async getAdminToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && Date.now() < this.tokenExpiry) {
      return this.accessToken as string;
    }

    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: 'admin-cli',
      username: this.adminUsername,
      password: this.adminPassword,
    });

    try {
      const response = await fetch(
        `${this.keycloakUrl}/realms/master/protocol/openid-connect/token`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get admin token: ${response.status}`);
      }

      const data = await response.json();
      this.accessToken = data.access_token;
      this.tokenExpiry = Date.now() + (data.expires_in - 60) * 1000; // Refresh 60s before expiry

      return this.accessToken as string;
    } catch (error) {
      logger.error(`Error getting Keycloak admin token: ${error}`);
      throw error;
    }
  }

  async createUser(request: CreateUserRequest): Promise<CreateUserResponse> {
    try {
      const token = await this.getAdminToken();

      // 1. Create user
      const createUserResponse = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            username: request.username,
            email: request.email,
            firstName: request.firstName,
            lastName: request.lastName,
            enabled: true,
            emailVerified: true,
            credentials: request.password
              ? [{ type: 'password', value: request.password, temporary: false }]
              : [],
          }),
        }
      );

      if (!createUserResponse.ok) {
        const error = await createUserResponse.text();
        logger.error(`Failed to create Keycloak user: ${error}`);
        return { success: false, error: `Failed to create user: ${error}` };
      }

      // 2. Get the created user's ID from Location header
      const locationHeader = createUserResponse.headers.get('Location');
      if (!locationHeader) {
        return { success: false, error: 'No location header returned' };
      }

      const userId = locationHeader.split('/').pop()!;

      // 3. Assign groups to user
      for (const group of request.groups) {
        await this.assignUserToGroup(userId, group, token);
      }

      logger.info(`Created Keycloak user: ${request.username} (${userId})`);
      return {
        success: true,
        sub: userId,
      };
    } catch (error) {
      logger.error(`Keycloak createUser error: ${error}`);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  private async assignUserToGroup(
    userId: string,
    groupName: UserGroup,
    token: string
  ): Promise<void> {
    try {
      // 1. Get group ID
      const groupResponse = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/groups?search=${groupName}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const groups: KeycloakGroup[] = await groupResponse.json();
      const group = groups.find((g: KeycloakGroup) => g.name === groupName);

      if (!group) {
        logger.warn(`Group ${groupName} not found in Keycloak`);
        return;
      }

      // 2. Assign user to group
      await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/users/${userId}/groups/${group.id}`,
        {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      logger.info(`Assigned user ${userId} to group ${groupName}`);
    } catch (error) {
      logger.error(`Failed to assign user to group ${groupName}:`, error);
    }
  }

  async deleteUser(sub: string): Promise<{ success: boolean; error?: string }> {
    try {
      const token = await this.getAdminToken();

      const response = await fetch(`${this.keycloakUrl}/admin/realms/${this.realm}/users/${sub}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete user: ${response.status}`);
      }

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
      const token = await this.getAdminToken();

      const response = await fetch(
        `${this.keycloakUrl}/admin/realms/${this.realm}/user?username=${username}&exact=true`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const users = await response.json();
      return users.length > 0;
    } catch (error) {
      logger.error('Error checking if user exists:', error);
      return false;
    }
  }

  mapRoleToGroup(role: Roles): UserGroup {
    if (role === Roles.CLIENT) {
      return UserGroup.WnpExternalClients;
    }
    // All internal users go to WnpInternalUsers
    return UserGroup.WnpInternalUsers;
  }
}
