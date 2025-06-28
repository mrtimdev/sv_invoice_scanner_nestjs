import { RoleEnum } from "src/enums/role.enum";

// src/database/seeds/role.seed.ts
export const DEFAULT_ROLES = [
  {
    name: RoleEnum.SUPER_ADMIN,
    permissions: ['*'],
    description: 'Full system access'
  },
  {
    name: RoleEnum.ADMIN,
    permissions: ['manage_users', 'manage_content'],
    description: 'Administrative access'
  }
  // ... other roles
];