import { Roles, User } from '@/common/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ALL_PERMISSIONS, PromoteUserDto, SetPermissionsDto } from './dto';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@Controller('permissions')
@Roles('ADMIN')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('my')
  @Roles('ADMIN', 'SUB_ADMIN')
  async getMyPermissions(@User() user: { id: string; role?: string }) {
    const role = (user.role ?? '').toLowerCase();
    if (role === 'admin') {
      return { permissions: ALL_PERMISSIONS };
    }
    const permissions = await this.permissionsService.getPermissions(user.id);
    return { permissions };
  }

  @Get('available')
  getAvailablePermissions() {
    return { data: ALL_PERMISSIONS };
  }

  @Get('sub-admins')
  getAllSubAdmins() {
    return this.permissionsService.getAllSubAdmins();
  }

  @Get(':userId')
  getPermissions(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.getPermissions(userId);
  }

  @Post()
  @HttpCode(HttpStatus.OK)
  setPermissions(@Body() dto: SetPermissionsDto, @User() user: { id: string }) {
    return this.permissionsService.setPermissions(dto, user.id);
  }

  @Post(':userId/promote')
  @HttpCode(HttpStatus.OK)
  promote(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Body() dto: PromoteUserDto,
  ) {
    return this.permissionsService.promote(userId, dto.role ?? 'sub_admin');
  }

  @Post(':userId/demote')
  @HttpCode(HttpStatus.OK)
  demote(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.demoteToStudent(userId);
  }

  @Delete(':userId')
  @HttpCode(HttpStatus.OK)
  revoke(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.revokePermissions(userId);
  }
}
