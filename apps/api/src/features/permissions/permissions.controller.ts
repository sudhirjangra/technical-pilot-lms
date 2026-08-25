import { Roles, User } from '@/common/decorators';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ALL_PERMISSIONS, SetPermissionsDto } from './dto';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@Controller('permissions')
@Roles('ADMIN')
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

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
  setPermissions(@Body() dto: SetPermissionsDto, @User() user: { id: string }) {
    return this.permissionsService.setPermissions(dto, user.id);
  }

  @Post(':userId/promote')
  promote(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.promoteToSubAdmin(userId);
  }

  @Post(':userId/demote')
  demote(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.demoteToStudent(userId);
  }

  @Delete(':userId')
  revoke(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.revokePermissions(userId);
  }
}
