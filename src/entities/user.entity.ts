import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, OneToMany, BeforeInsert, ManyToMany, JoinTable } from 'typeorm';
import { Scan } from '../api/scans/entities/scan.entity';
import { IsEmail, IsString } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { Role } from './role.entity';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  
  @Column({ unique: true, length: 100 })
  @IsString()
  username: string;

  @Column({ unique: true, length: 100 })
  @IsEmail()
  email: string;

  @Column({ length: 100, nullable: true, name: 'first_name' })
  firstName: string;

  @Column({ length: 100, nullable: true, name: 'last_name' })
  lastName: string;

  @Column({ length: 100, nullable: true, name: 'native_name' })
  nativeName: string;

  @Column({ default: true, name: 'is_active' })
  isActive: boolean;

  @Column({ length: 255 })
  password: string;

  @Column({nullable: true, name: 'avatar' })
  avatar: string;

  @Column({name: 'created_at', type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @Column({ default: false, name: 'is_deleted' })
  isDeleted: boolean;

  @OneToMany(() => Scan, scan => scan.user)
  scans: Scan[];

  @ManyToMany(() => Role)
  @JoinTable()
  roles: Role[];

  @BeforeInsert()
  async hashPassword() {
    this.password = await bcrypt.hash(this.password, 10);
  }
}

export type UserResponse = Omit<User, 'password' | 'hashPassword'>;