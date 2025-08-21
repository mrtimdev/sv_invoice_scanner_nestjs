import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { User } from '../../entities/user.entity';
import { RegisterDto } from 'src/api/auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
    constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

    async register(registerDto: RegisterDto): Promise<User> {
        // Check if username or email already exists
        const existingUser = await this.userRepository.findOne({
        where: [
            { username: registerDto.username },
            { email: registerDto.email }
        ]
        });

        if (existingUser) {
        throw new ConflictException('Username or email already exists');
        }
        const user = this.userRepository.create({
            ...registerDto
        });

        return this.userRepository.save(user);
    }

    async create(createUserDto: CreateUserDto): Promise<User> {
        const newUser = this.userRepository.create(createUserDto);
        return this.userRepository.save(newUser);
    }

    async findAll(): Promise<User[]> {
        return this.userRepository.find();
    }

    async findOne(id: number): Promise<User> {
        // const user = await this.userRepository.findOneBy({ id }, relations: ['roles']);
        const user = await this.userRepository.findOne({
            where: { id },
            relations: ['roles'],
        });
        if (!user) {
            throw new NotFoundException(`User with ID ${id} not found`);
        }
        return user;
    }
    
    async findByUsername(username: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { username }, relations: ['roles'], });
    }

    async findByEmail(email: string): Promise<User | null> {
        return this.userRepository.findOne({ where: { email }, relations: ['roles'], });
    }

    async update(id: number, updateUserDto: UpdateUserDto): Promise<User> {
        await this.userRepository.update(id, updateUserDto);
        const updatedUser = await this.findOne(id);
        return updatedUser;
    }

    async remove(id: number): Promise<void> {
        const result = await this.userRepository.delete(id);
        if (result.affected === 0) {
        throw new NotFoundException(`User with ID ${id} not found`);
        }
    }
}
