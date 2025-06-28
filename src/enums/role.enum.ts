
export enum RoleEnum {
  SUPER_ADMIN = 'super_admin',
  ADMIN = 'admin',
  EDITOR = 'editor',
  USER = 'user',
  GUEST = 'guest',
}

// Optional: Helper type for role checks
export type RoleType = keyof typeof RoleEnum;