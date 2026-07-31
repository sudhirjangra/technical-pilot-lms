import { Controller, Get, Param } from '@nestjs/common';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  async findAll() {
    const data = await this.usersService.findAll();
    return { message: 'Users fetched successfully', data };
  }

  @Get(':identifier')
  async findOne(@Param('identifier') identifier: string) {
    const data = await this.usersService.findOne(identifier);
    return { message: 'User fetched successfully', data };
  }
}
