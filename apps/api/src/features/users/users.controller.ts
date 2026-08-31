import { Permissions, Roles } from '@/common/decorators';
import { RolesGuard } from '@/common/guards/roles.guard';
import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, UseGuards } from '@nestjs/common';
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
  @Permissions('students:read')
  @Get(':identifier')
  async findOne(@Param('identifier') identifier: string) {
    const data = await this.usersService.findOne(identifier);
    return { message: 'User fetched successfully', data };
  }
}
