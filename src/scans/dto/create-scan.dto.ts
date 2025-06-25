// scans/dto/create-scan.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsDateString } from 'class-validator';

export class CreateScanDto {
    @IsOptional()
    @IsString()
    imagePath?: string;

    @IsOptional()
    @IsString()
    scannedText?: string;

    @IsOptional()
    @IsDateString()
    date?: Date;
}