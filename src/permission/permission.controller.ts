// src/permissions/permissions.controller.ts
import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { CreatePermissionDto } from './dto/create-permission.dto';
import { UpdatePermissionDto } from './dto/update-permission.dto';
import { RoleEnum } from '../enums/role.enum';
import { PermissionService } from './permission.service';

@Controller('permissions')
    // @Roles(RoleEnum.SUPER_ADMIN) // Only super admin can manage permissions
    export class PermissionController {
    constructor(private readonly permissionService: PermissionService) {}

    @Post()
    create(@Body() createPermissionDto: CreatePermissionDto) {
        return this.permissionService.create(createPermissionDto);
    }

    @Get()
    findAll() {
        return this.permissionService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: number) {
        return this.permissionService.findOne(+id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updatePermissionDto: UpdatePermissionDto) {
        return this.permissionService.update(+id, updatePermissionDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.permissionService.remove(+id);
    }
}