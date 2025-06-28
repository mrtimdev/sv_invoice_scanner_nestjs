import { RoleEnum } from "src/enums/role.enum";

export class UpdateRoleDto {
    name?: RoleEnum;
    description?: string;
    permissions?: string[];
}