// src/users/dto/update-user.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { IsArray, IsBoolean, IsNotEmpty, IsNumber, IsOptional, IsString, MinLength, Validate } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PasswordMatch } from 'src/validators/password-match.validator';

export class UpdateUserDto extends PartialType(
    OmitType(CreateUserDto, ['password', 'confirmPassword'] as const)
) {
    
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsString()
    @IsOptional()
    @MinLength(6)
    password?: string;
    
    @Transform(({ value }) => (value === '' ? undefined : value))
    @IsString()
    @IsOptional()
    @MinLength(6)
    @Validate(PasswordMatch, ['password'])
    confirmPassword?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean;

}