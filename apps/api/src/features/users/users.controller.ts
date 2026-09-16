import { Permissions, Roles } from '@/common/decorators';
import { RolesGuard } from '@/common/guards/roles.guard';
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { BanDeviceDto } from './dto/manage-device.dto';
import { UsersService } from './users.service';

@Controller('users')
@UseGuards(RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('students:read')
  @Get()
  async findAll() {
    const data = await this.usersService.findAll();
    return { message: 'Users fetched successfully', data };
  }

  @Roles('ADMIN')
  @Patch(':id/toggle-active')
  async toggleActive(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { is_active: boolean },
  ) {
    const data = await this.usersService.toggleActive(id, body.is_active);
    return { message: 'User status updated', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('students:manage_devices')
  @Get(':id/devices')
  async getUserDevices(@Param('id', ParseUUIDPipe) id: string) {
    const data = await this.usersService.getUserDevices(id);
    return { message: 'User devices fetched successfully', data };
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('students:manage_devices')
  @Delete(':id/devices/:deviceId')
  async logoutUserDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
  ) {
    const result = await this.usersService.logoutUserDevice(id, deviceId);
    return result;
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('students:manage_devices')
  @Delete(':id/devices')
  async logoutAllUserDevices(@Param('id', ParseUUIDPipe) id: string) {
    const result = await this.usersService.logoutAllUserDevices(id);
    return result;
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('students:manage_devices')
  @Patch(':id/devices/:deviceId/ban')
  async toggleBanDevice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('deviceId', ParseUUIDPipe) deviceId: string,
    @Body() dto: BanDeviceDto,
  ) {
    const result = await this.usersService.toggleBanDevice(
      id,
      deviceId,
      dto.is_banned,
    );
    return result;
  }

  @Roles('ADMIN', 'SUB_ADMIN')
  @Permissions('students:read')
  @Get(':identifier')
  async findOne(@Param('identifier') identifier: string) {
    const data = await this.usersService.findOne(identifier);
    return { message: 'User fetched successfully', data };
  }
}
