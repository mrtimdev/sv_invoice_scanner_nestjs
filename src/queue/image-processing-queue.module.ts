import { forwardRef, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScansModule } from 'src/api/scans/scans.module';
import { ImageProcessingProcessor } from './image-processing.processor';
import * as path from 'path';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        redis: {
          host: configService.get<string>('REDIS_HOST') || 'localhost',
          port: configService.get<number>('REDIS_PORT') || 6379,
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'image_processing',
        defaultJobOptions: {
            removeOnComplete: true,
            removeOnFail: true,
        },
    }),
    // ScansModule
  ],
//   providers: [ImageProcessingProcessor],
  exports: [],
})
export class ImageProcessingQueueModule {}