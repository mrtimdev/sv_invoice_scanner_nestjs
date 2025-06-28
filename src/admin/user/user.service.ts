// src/admin/user/user.service.ts
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { Role } from 'src/entities/role.entity';
import { RoleDto } from 'src/role/dto/role.dto';
import { UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';

@Injectable()
export class UserService {
    constructor(
        @InjectRepository(User)
        private userRepository: Repository<User>,
        @InjectRepository(Role)
        private roleRepository: Repository<Role>,
    ) {}

    async create(createUserDto: CreateUserDto): Promise<UserResponseDto> {
        const user = this.userRepository.create(createUserDto);
        
        if (createUserDto.roles) {
            user.roles = await this.roleRepository.findByIds(createUserDto.roles);
        }

        const savedUser = await this.userRepository.save(user);
        return this.toResponseDto(savedUser);
    }

    async update(id: number, updateUserDto: UpdateUserDto): Promise<UserResponseDto> {
        const user = await this.userRepository.preload({
        id,
        ...updateUserDto,
        });

        if (!user) {
        throw new NotFoundException(`User #${id} not found`);
        }

        if (updateUserDto.roles) {
            user.roles = await this.roleRepository.findByIds(updateUserDto.roles);
        }

        const updatedUser = await this.userRepository.save(user);
        return this.toResponseDto(updatedUser);
    }

    private toResponseDto(user: User): UserResponseDto {
        const { password, ...userData } = user;
        return {
            ...userData,
                roles: user.roles,
            };
    }



    async getAllRoles(): Promise<Role[]> {
        return this.roleRepository.find();
    }

    async findAll(): Promise<UserResponseDto[]> {
        const users = await this.userRepository.find({ relations: ['roles'] });
        return users.map(user => this.toResponseDto(user));
    }

    async findOne(id: number): Promise<UserResponseDto> {
        const user = await this.userRepository.findOne({ 
            where: { id },
            relations: ['roles'] 
        });
        if (!user) {
            throw new NotFoundException(`User #${id} not found`);
        }
        return this.toResponseDto(user);
    }


    async getUserWithRoles(userId: number): Promise<{ user: UserDto; roles: RoleDto[] }> {
        const user = await this.userRepository.findOne({
            where: { id: userId },
            relations: ['roles', 'roles.permissions'] // Include permissions if needed
        });

        if (!user) {
            throw new NotFoundException(`User with ID ${userId} not found`);
        }

        return {
            user: plainToInstance(UserDto, user, {
                excludeExtraneousValues: true,
                enableImplicitConversion: true
            }),
            roles: user.roles|| []
        };
    }
}