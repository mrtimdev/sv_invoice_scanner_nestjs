// src/users/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateUserDto extends PartialType(
    OmitType(CreateUserDto, ['password', 'confirmPassword'] as const)
) {
    @IsString()
    @MinLength(8)
    @IsOptional()
    newPassword?: string;
    isActive?: boolean;
}