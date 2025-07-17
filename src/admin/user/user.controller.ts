import { BadRequestException, Body, Controller, Delete, Get, HttpException, HttpStatus, InternalServerErrorException, NotFoundException, Param, Patch, Post, Query, Render, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto, UserResponseDto, UpdateUserDto } from './dto'
import { Roles } from 'src/api/auth/decorators/roles.decorator';
import { RoleEnum } from 'src/enums/role.enum';
import { RedirectIfAuthenticatedGuard } from 'src/api/auth/guards/redirect-if-authenticated.guard';
import { JwtAuthGuard } from 'src/api/auth/guards/jwt-auth.guard';
import { RolesGuard } from 'src/api/auth/guards/roles.guard';
import { User } from 'src/entities/user.entity';
import { Response, Request } from 'express';

@UsePipes(new ValidationPipe({ transform: true, whitelist: false }))
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
// @Roles(RoleEnum.ADMIN)
export class UserController {


    constructor(private readonly userService: UserService) {}
    
    @Get()
    @Render('user')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async showFormList(@Req() req: Request) {
        const roles = await this.userService.getAllRoles();
        return { 
            currentPath: req.path,
            title: 'User List',
            roles 
        };
    }


    @Get('data')
    @UseGuards(JwtAuthGuard)
    async getUsersData(
        @Req() req: Request & { user: User },
        @Query() query: any
    ) {
        try {
            const draw = parseInt(query.draw);
            const start = parseInt(query.start);
            const length = parseInt(query.length);
            const orderColumn = query.order?.[0]?.column;

            const orderDir = req.query.order?.[0]?.dir.toString();
            const searchValue = req.query['search[value]']?.toString();

            console.log({length, orderDir})

            const { users, total } = await this.userService.findForDataTable(
                start,
                length,
                searchValue,
                orderColumn,
                orderDir
            );
            
            return {
                draw,
                recordsTotal: total,
                recordsFiltered: total, 
                data: users
            };
        } catch (error) {
            console.error(error);
            throw new HttpException('Failed to load users data', HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    
    @Get('create')
    @Render('user/create')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async showCreateForm(@Req() req: Request) {
        const roles = await this.userService.getAllRoles();
        return { 
            currentPath: req.path,
            title: 'Create New User',
            roles 
        };
    }

    @Post()
    create(@Body() createUserDto: CreateUserDto): Promise<UserResponseDto> {
        return this.userService.create(createUserDto);
    }


    @Get('edit/:id')
    @Render('user/edit')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async showUpdateForm(
        @Req() req: Request,
        @Param('id') id: string,
    ) {
        try {
            const [tempUser, roles] = await Promise.all([
                this.userService.findOneById(+id), 
                this.userService.getAllRoles()
            ]);

            if (!tempUser) {
                throw new NotFoundException('User not found');
            }
            const selectedRoles = tempUser.roles.map((role) => role.id);
            return { 
                currentPath: req.path,
                title: 'Update User',
                tempUser,
                roles,
                selectedRoles
            };
        } catch (error) {
            if (error instanceof NotFoundException) {
                return { error: error.message };
            }
            throw error; 
        }
    }

    @Patch(':id')
    async update(
        @Param('id') id: string,
        @Body() updateUserDto: UpdateUserDto,
    ): Promise<UserResponseDto> {
        return this.userService.update(+id, updateUserDto);
    }


    @Delete(':id')
    @UseGuards(JwtAuthGuard, RolesGuard)
    async deleteUser(
        @Param('id') id: string,
    ) {
        try {
            await this.userService.deleteUserIfNoScans(+id);
            return { message: 'User deleted successfully' };
        } catch (error) {
            if (error instanceof NotFoundException || error instanceof BadRequestException) {
                throw error;
            }
            throw new InternalServerErrorException('Failed to delete user');
        }
    }
}
