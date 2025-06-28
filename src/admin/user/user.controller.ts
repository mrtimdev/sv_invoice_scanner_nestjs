import { Body, Controller, Get, Param, Patch, Post, Render, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UserResponseDto, UpdateUserDto } from './dto'
import { Roles } from 'src/api/auth/decorators/roles.decorator';
import { RoleEnum } from 'src/enums/role.enum';
import { RedirectIfAuthenticatedGuard } from 'src/api/auth/guards/redirect-if-authenticated.guard';
import { JwtAuthGuard } from 'src/api/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/guards/roles.guard';

@UsePipes(new ValidationPipe({ transform: true, whitelist: false }))
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(RoleEnum.ADMIN)
export class UserController {


    constructor(private readonly userService: UserService) {}
    
    @Get()
    @Render('user')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async showFormList() {
        const roles = await this.userService.getAllRoles();
        return { 
            title: 'User List',
            roles 
        };
    }

    
    @Get('create')
    @Render('user/create')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async showCreateForm() {
        const roles = await this.userService.getAllRoles();
        return { 
            title: 'Create New User',
            roles 
        };
    }

    @Post()
    create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
        return this.userService.create(createUserDto);
    }

    @Patch(':id')
    update(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(+id, updateUserDto);
    }
}
