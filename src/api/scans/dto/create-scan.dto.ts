// scans/dto/create-scan.dto.ts
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum } from 'class-validator';
import { ScanType } from 'src/enums/scan-type.enum';

export class CreateScanDto {
    @IsOptional()
    @IsString()
    imagePath?: string;

    @IsOptional()
    @IsString()
    originalName?: string;

    @IsOptional()
    @IsString()
    scannedText?: string;

    @IsOptional()
    @IsEnum(ScanType, { message: 'scanType must be KHB, GENERAL, or OTHER' })
    scanType?: ScanType;
    

    @IsOptional()
    @IsDateString()
    date?: Date;
}