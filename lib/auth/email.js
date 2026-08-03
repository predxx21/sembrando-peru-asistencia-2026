export const ORGANIZATION_DOMAIN = '@sembrandoperu.org';

export function isOrganizationEmail(email) {
  return String(email).trim().toLowerCase().endsWith(ORGANIZATION_DOMAIN);
}
