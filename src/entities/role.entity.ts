// src/entities/role.entity.ts
import { RoleEnum } from 'src/enums/role.enum';
import { Entity, PrimaryGeneratedColumn, Column, ManyToMany } from 'typeorm';
import { Permission } from './permission.entity';

@Entity('roles')
export class Role {
    @PrimaryGeneratedColumn()
    id: number;

    @Column({
        type: 'enum',
        enum: RoleEnum,
        unique: false
    })
    code: RoleEnum;

    @Column({ unique: true })
    name: string; 

    @Column({ nullable: true })
    description?: string;

    @ManyToMany(() => Permission, permission => permission.roles)
    permissions: Permission[];
}