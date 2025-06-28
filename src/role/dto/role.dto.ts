import { UserResponseDto } from "src/admin/user/dto";
import { PermissionDto } from "src/admin/user/dto/permission.dto";
import { User } from "src/entities/user.entity";
import { RoleEnum } from "src/enums/role.enum";


export class RoleDto {
  id: number;
  name: string; 
  code: RoleEnum;
  description?: string;
  permissions: PermissionDto[];
    
    
}


