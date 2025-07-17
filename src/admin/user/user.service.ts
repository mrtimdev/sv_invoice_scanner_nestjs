// src/admin/user/user.service.ts
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../../entities/user.entity';
import { CreateUserDto, UpdateUserDto, UserResponseDto } from './dto';
import { Role } from 'src/entities/role.entity';
import { RoleDto } from 'src/role/dto/role.dto';
import { UserDto } from './dto/user.dto';
import { plainToInstance } from 'class-transformer';
import * as bcrypt from 'bcrypt';

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

        // Handle password update
        if (updateUserDto.password) {
            user.password = await bcrypt.hash(updateUserDto.password, 10);
        }

        if (updateUserDto.roles) {
            user.roles = await this.roleRepository.findByIds(updateUserDto.roles);
        }

        const updatedUser = await this.userRepository.save(user);
        return this.toResponseDto(updatedUser);
    }

    async updateUser(id: number, updateData: UpdateUserDto) {
        const user = await this.userRepository.findOne({ 
            where: { id },
            relations: ['roles']
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        // Handle password update
        if (updateData.password) {
            user.password = await bcrypt.hash(updateData.password, 10);
        }

        // Handle role updates
        if (updateData.roles) {
            const roles = await this.roleRepository.findByIds(updateData.roles);
            user.roles = roles;
        }

        // Update other fields
        Object.assign(user, updateData);

        return this.userRepository.save(user);
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

    async findOneById(id: number): Promise<User | null> {
        return this.userRepository.findOne({
            where: { id },
            relations: ['roles'] 
        });
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


    async findForDataTable(
        start: number,
        length: number,
        searchValue?: string,
        orderColumn?: number,
        orderDir?: 'asc' | 'desc'
    ) {
        const query = this.userRepository.createQueryBuilder('user')
            .leftJoinAndSelect('user.roles', 'roles')
            .skip(start)
            .take(length);

        // Search across multiple fields
        if (searchValue) {
            query.where(
                '(user.username LIKE :search OR ' +
                'user.email LIKE :search OR ' +
                'user.firstName LIKE :search OR ' +
                'user.lastName LIKE :search)',
                { search: `%${searchValue}%` }
            );
        }

        // Map column index to database field
        const columnMap = [
            'user.id', // Index column
            'user.username',
            'user.email',
            'user.firstName',
            'user.lastName',
            'user.createdAt',
            'roles.name' // For role display
        ];

        if (orderColumn !== undefined && orderDir && columnMap[orderColumn]) {
            query.orderBy(columnMap[orderColumn], orderDir.toUpperCase() as 'ASC' | 'DESC');
        } else {
            query.orderBy('user.createdAt', 'DESC'); // Default sorting
        }

        const [users, total] = await query.getManyAndCount();
        
        return { 
            users: users.map(user => ({
                ...user,
                roleNames: user.roles.map(role => role.name).join(', ')
            })), 
            total 
        };
    }


    async deleteUserIfNoScans(id: number): Promise<void> {
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['scans'] 
        });

        if (!user) {
            throw new NotFoundException('User not found');
        }

        if (user.scans && user.scans.length > 0) {
            throw new BadRequestException('Cannot delete user with associated scans');
        }

        await this.userRepository.remove(user);
    }


    async softDeleteUser(id: number): Promise<void> {
        await this.userRepository.update(id, { isDeleted: true });
    }
}