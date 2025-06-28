import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../../entities/user.entity';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UserRepository } from 'src/repository/user.repository';
import { Scan } from 'src/api/scans/entities/scan.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, UserRepository, Scan])],
  providers: [UsersService],
  controllers: [UsersController],
  exports: [UsersService], // If needed by other modules
})
export class UsersModule {}