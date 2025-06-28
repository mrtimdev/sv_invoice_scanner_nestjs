// src/users/dto/user.dto.ts
import { Exclude, Expose, Type } from 'class-transformer';
import { RoleDto } from 'src/role/dto/role.dto';

export class UserDto {
    @Expose()
    id: number;
    
    @Expose()
    username: string;
    
    @Expose()
    email: string;
    
    @Expose()
    firstName: string;
    
    @Expose()
    lastName: string;
    
    @Expose()
    isActive: boolean;
    
    @Expose()
    createdAt: Date;
    
    @Expose()
    updatedAt: Date;
    
    @Exclude()
    password: string;

    @Expose()
    @Type(() => RoleDto)
    roles: RoleDto[];
}