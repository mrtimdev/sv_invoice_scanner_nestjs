// src/reports/dto/filter.dto.ts
import { IsOptional, IsString, IsIn } from 'class-validator';

export class ReportFilterDto {
  @IsOptional()
  @IsIn(['today', 'week', 'month', 'quarter', 'year', 'custom'])
  timeRange?: string;

  @IsOptional()
  @IsString()
  startDate?: string;

  @IsOptional()
  @IsString()
  endDate?: string;

  @IsOptional()
  @IsIn(['all', 'monthly', 'weekly'])
  range?: string;

  @IsOptional()
  @IsString()
  year?: string;
}