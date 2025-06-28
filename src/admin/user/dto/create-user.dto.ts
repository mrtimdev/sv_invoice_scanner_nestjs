// src/users/dto/create-user.dto.ts
import { 
    IsEmail, 
    IsNotEmpty, 
    IsString, 
    MinLength, 
    IsBoolean, 
    IsOptional, 
    IsArray, 
    Validate 
} from 'class-validator';
import { RoleDto } from 'src/role/dto/role.dto';
import { PasswordMatch } from 'src/validators/password-match.validator';

export class CreateUserDto {
    @IsEmail()
    @IsNotEmpty()
    email: string;

    @IsString()
    @IsNotEmpty()
    username: string;

    @IsString()
    @MinLength(6)
    @IsNotEmpty()
    password: string;

    @IsString()
    @MinLength(6)
    @Validate(PasswordMatch, ['password'])
    @IsNotEmpty()
    confirmPassword: string;

    @IsString()
    @IsOptional()
    firstName?: string;

    @IsString()
    @IsOptional()
    lastName?: string;

    @IsBoolean()
    @IsOptional()
    isActive?: boolean = true;

    @IsArray()
    @IsOptional()
    roles?: RoleDto[];
}