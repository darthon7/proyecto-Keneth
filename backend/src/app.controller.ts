import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service.js';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

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
