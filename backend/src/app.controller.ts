import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from './auth/index.js';
import { Roles, RolesGuard } from './common/auth/index.js';
import { UserRole } from './users/entities/user-role.enum.js';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('admin/summary')
  getAdminSummary() {
    return this.appService.getAdminSummary();
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Get('seed')
  async triggerSeed() {
    const result = await this.appService.manualSeed();
    return {
      success: true,
      message: 'Base de datos poblada exitosamente con el catálogo completo',
      result,
    };
  }
}
