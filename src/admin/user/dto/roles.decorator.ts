// roles.decorator.ts
import { SetMetadata } from '@nestjs/common';
export const ROLES_KEY = 'admin';
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);
