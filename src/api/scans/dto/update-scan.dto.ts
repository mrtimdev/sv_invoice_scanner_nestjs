// scans/dto/update-scan.dto.ts
import { IsString, IsOptional, IsDateString, IsNotEmpty } from 'class-validator';

export class UpdateScanDto {
  @IsOptional()
  @IsString()
  imagePath?: string;

  @IsOptional()
  @IsString()
  scannedText?: string;

  @IsOptional()
  @IsDateString()
  date?: Date;

  // Add validation for other fields you want to be updatable
}