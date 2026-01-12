import { env } from '../../config/environment';
import { logger } from '../../utils/logger';

export interface TokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

export interface TokenExchangeResult {
  success: boolean;
  tokens?: TokenResponse;
  error?: string;
}

export class TokenExchangeService {
  /**
   * Get IDP token using username and password
   * Works with both Keycloak and Cognito
   */
  async getTokenWithPassword(username: string, password: string): Promise<TokenExchangeResult> {
    const provider = env.AUTH_PROVIDER;

    try {
      if (provider === 'keycloak') {
        return await this.getKeycloakToken(username, password);
      } else if (provider === 'cognito') {
        return await this.getCognitoToken(username, password);
      }

      return {
        success: false,
        error: `Unknown AUTH_PROVIDER: ${provider}`,
      };
    } catch (error) {
      logger.error('Token exchange error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Token exchange failed',
      };
    }
  }

  /**
   * Get token from Keycloak using Resource Owner Password Credentials flow
   */
  private async getKeycloakToken(username: string, password: string): Promise<TokenExchangeResult> {
    const keycloakUrl = env.KEYCLOAK_URL;
    const realm = env.KEYCLOAK_REALM;
    const clientId = env.KEYCLOAK_CLIENT_ID;

    if (!clientId) {
      return {
        success: false,
        error: 'KEYCLOAK_CLIENT_ID not configured',
      };
    }

    const params = new URLSearchParams({
      grant_type: 'password',
      client_id: clientId,
      username,
      password,
      scope: 'openid email profile',
    });

    try {
      const response = await fetch(`${keycloakUrl}/realms/${realm}/protocol/openid-connect/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('Keycloak token error:', errorText);
        return {
          success: false,
          error: 'Failed to obtain Keycloak token',
        };
      }

      const tokens = await response.json();

      logger.info(`✅ Obtained Keycloak token for user: ${username}`);

      return {
        success: true,
        tokens,
      };
    } catch (error) {
      logger.error('Keycloak token exchange failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Keycloak token exchange failed',
      };
    }
  }

  /**
   * Get token from AWS Cognito using USER_PASSWORD_AUTH flow
   */
  private async getCognitoToken(username: string, password: string): Promise<TokenExchangeResult> {
    // Import AWS SDK dynamically (only when needed)
    const { CognitoIdentityProviderClient, InitiateAuthCommand } =
      await import('@aws-sdk/client-cognito-identity-provider');

    const region = env.AWS_REGION;
    const clientId = env.COGNITO_CLIENT_ID;

    if (!clientId) {
      return {
        success: false,
        error: 'COGNITO_CLIENT_ID not configured',
      };
    }

    const client = new CognitoIdentityProviderClient({ region });

    try {
      const command = new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: clientId,
        AuthParameters: {
          USERNAME: username,
          PASSWORD: password,
        },
      });

      const response = await client.send(command);

      if (!response.AuthenticationResult) {
        return {
          success: false,
          error: 'No authentication result from Cognito',
        };
      }

      const tokens: TokenResponse = {
        access_token: response.AuthenticationResult.AccessToken!,
        id_token: response.AuthenticationResult.IdToken,
        refresh_token: response.AuthenticationResult.RefreshToken,
        expires_in: response.AuthenticationResult.ExpiresIn || 3600,
        token_type: response.AuthenticationResult.TokenType || 'Bearer',
      };

      logger.info(`✅ Obtained Cognito token for user: ${username}`);

      return {
        success: true,
        tokens,
      };
    } catch (error) {
      logger.error('Cognito token exchange failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Cognito token exchange failed',
      };
    }
  }
}

export const tokenExchangeService = new TokenExchangeService();
