import { Roles, User } from '@/common/decorators';
import {
  Audit,
  AuditLogInterceptor,
} from '@/common/interceptors/audit-log.interceptor';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { ALL_PERMISSIONS, SetPermissionsDto } from './dto';
import { PermissionsService } from './permissions.service';

@ApiTags('Permissions')
@Controller('permissions')
@Roles('ADMIN')
@UseInterceptors(AuditLogInterceptor)
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
  @Audit('permissions.set')
  setPermissions(@Body() dto: SetPermissionsDto, @User() user: { id: string }) {
    return this.permissionsService.setPermissions(dto, user.id);
  }

  @Post(':userId/promote')
  @Audit('permissions.promote')
  promote(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.promoteToSubAdmin(userId);
  }

  @Post(':userId/demote')
  @Audit('permissions.demote')
  demote(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.demoteToStudent(userId);
  }

  @Delete(':userId')
  @Audit('permissions.revoke')
  revoke(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.revokePermissions(userId);
  }
}
