// config/config.service.ts
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class CustomConfigService {
  constructor(private readonly configService: ConfigService) {}

  get maxFileSize(): number {
    const DEFAULT_FILE_SIZE_MB = 5;
    const mbSize = this.configService.get<string>('MAX_FILE_SIZE_MB');
    const size = mbSize ? parseInt(mbSize) : DEFAULT_FILE_SIZE_MB;
    return size * 1024 * 1024;
  }

  get uploadPath(): string {
    return this.configService.get<string>('UPLOAD_PATH') || './uploads/scans';
  }
}