// scans/dto/scan-response.dto.ts
import { Exclude, Expose, Transform } from 'class-transformer';
import { User } from 'src/users/entities/user.entity';

export class ScanResponseDto {
  @Expose()
  id: number;

  @Expose()
  imagePath: string;

  @Expose()
  scannedText: string;

  @Expose()
  date: Date;

  @Expose()
  timestamp: Date;

  @Expose()
  @Transform(({ obj }) => ({
    id: obj.user.id,
    username: obj.user.username,
    full_name: `${obj.user.first_name} ${obj.user.last_name}`,
    email: obj.user.email
  }))
  user: Partial<User>;

  constructor(partial: Partial<ScanResponseDto>) {
    Object.assign(this, partial);
  }
}