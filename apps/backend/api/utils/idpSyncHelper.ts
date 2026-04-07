import { getIdpAdminService } from '../services/idp/IdpAdminFactory';
import { UpdateUserRequest } from '../services/idp/IIdpAdminService';
import { logger } from './logger';
import { Roles } from '@prisma/client';

/**
 * Fields from a profile update that are relevant to the IDP.
 * rawPassword = plaintext password BEFORE hashing (must be captured in controller)
 */
export interface IdpSyncFields {
  rawPassword?: string;
  username?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: Roles;
}
/**
 * Syncs profile changes to the IDP for a migrated user.
 * Only called when cognitoSub is present.
 * Non-blocking — logs warnings on failure but does not throw.
 */
export async function syncProfileToIdp(
  cognitoSub: string,
  username: string,
  fields: IdpSyncFields,
  entityLabel: string // e.g. "user abc-123" or "client xyz-456" for logging
): Promise<{ synced: boolean; skippedFields?: string[] }> {
  const updates: UpdateUserRequest = {};

  if (fields.rawPassword) updates.password = fields.rawPassword;
  if (fields.email) updates.email = fields.email;
  if (fields.firstName) updates.firstName = fields.firstName;
  if (fields.lastName) updates.lastName = fields.lastName;
  if (fields.role) updates.role = fields.role;
  // Username is intentionally excluded from IDP sync.
  // - Cognito: username is immutable after creation
  // - Keycloak: editUsernameAllowed is false by default (login identifier stability)
  // Username changes are stored in the DB only and resolved at login
  // via the cognitoSub lookup path, not the username path.
  // Nothing IDP-relevant changed
  if (fields.username) {
    logger.info(
      `IDP sync: username change for ${entityLabel} stored in DB only (IDP username is immutable)`
    );
  }
  if (Object.keys(updates).length === 0) {
    return { synced: true };
  }

  const idpAdmin = getIdpAdminService();
  const result = await idpAdmin.updateUser(cognitoSub, username, updates);

  if (!result.success) {
    logger.warn(`IDP sync failed for ${entityLabel}: ${result.error}`);
    return { synced: false };
  }

  if (result.skippedFields?.length) {
    logger.warn(`IDP sync skipped fields for ${entityLabel}: ${result.skippedFields.join(', ')}`);
  }

  return { synced: true, skippedFields: result.skippedFields };
}
