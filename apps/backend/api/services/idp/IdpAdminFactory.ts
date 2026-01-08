import { IIdpAdminService } from './IIdpAdminService';
import { KeycloakAdminService } from './KeycloakAdminService';
import { CognitoAdminService } from './CognitoAdminService';
import { env } from '../../config/environment';

export function getIdpAdminService(): IIdpAdminService {
  const provider = env.AUTH_PROVIDER;

  switch (provider) {
    case 'keycloak':
      return new KeycloakAdminService();
    case 'cognito':
      return new CognitoAdminService();
    default:
      throw new Error(`Unknown AUTH_PROVIDER: ${provider}`);
  }
}
