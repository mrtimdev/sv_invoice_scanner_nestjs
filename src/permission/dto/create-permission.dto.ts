import { IsNotEmpty, IsString } from 'class-validator';

export class CreatePermissionDto {
    @IsNotEmpty()
    @IsString()
    name: string;

    @IsString()
    description?: string;

    @IsNotEmpty()
    @IsString()
    code: string;
}

