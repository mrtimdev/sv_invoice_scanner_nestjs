import { PermissionDto } from "src/admin/user/dto/permission.dto";
import { RoleEnum } from "src/enums/role.enum";

export class CreateRoleDto {
  name: RoleEnum;
  code?: string;
  description?: string;
}