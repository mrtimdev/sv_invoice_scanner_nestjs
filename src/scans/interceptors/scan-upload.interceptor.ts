// scans/interceptors/scan-upload.interceptor.ts
import { Injectable, mixin } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { CustomConfigService } from '../../config/config.service';

export function ScanUploadInterceptor() {
  @Injectable()
  class Interceptor {
    constructor(public configService: CustomConfigService) {}

    intercept() {
      return FileInterceptor('image', {
        storage: diskStorage({
          destination: this.configService.uploadPath,
          filename: (req, file, cb) => {
            const randomName = Array(32).fill(null).map(() => 
              Math.round(Math.random() * 16).toString(16)).join('');
            return cb(null, `${randomName}${extname(file.originalname)}`);
          }
        }),
        fileFilter: (req, file, cb) => {
          if (!file.originalname.match(/\.(jpg|jpeg|png|pdf)$/)) {
            return cb(new Error('Only image and PDF files are allowed!'), false);
          }
          cb(null, true);
        },
        limits: {
          fileSize: this.configService.maxFileSize
        }
      });
    }
  }

  return mixin(Interceptor);
}