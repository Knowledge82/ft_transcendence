import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

// Usage: @Roles('INQUISIDOR', 'ARZOBISPO') above a controller method —
// attaches metadata that RolesGuard reads later to decide access
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
