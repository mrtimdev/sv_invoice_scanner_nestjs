// src/users/dto/response-user.dto.ts
import { Expose, Type } from 'class-transformer';
import { RoleDto } from 'src/role/dto/role.dto';

export class UserResponseDto {
    id: number;
    username: string;
    email: string;
    firstName: string;
    lastName: string;
    nativeName: string;
    isActive: boolean;
    createdAt: Date;
    updatedAt?: Date; 
    roles: RoleDto[];
}