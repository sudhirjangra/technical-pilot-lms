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
  @HttpCode(HttpStatus.OK)
  setPermissions(@Body() dto: SetPermissionsDto, @User() user: { id: string }) {
    return this.permissionsService.setPermissions(dto, user.id);
  }

  @Post(':userId/promote')
  @HttpCode(HttpStatus.OK)
  promote(@Param('userId', ParseUUIDPipe) userId: string) {
    return this.permissionsService.promoteToSubAdmin(userId);
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
