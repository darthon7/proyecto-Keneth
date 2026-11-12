import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { Game } from './games/entities/game.entity.js';
import { executeSeed } from './database/seed.js';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onApplicationBootstrap() {
    try {
      const gameRepo = this.dataSource.getRepository(Game);
      const count = await gameRepo.count();
      if (count === 0) {
        this.logger.log('🌱 Base de datos vacía detectada. Iniciando auto-seeding de catálogo...');
        const result = await executeSeed(this.dataSource);
        this.logger.log(`✅ Auto-seeding completado: ${result.createdCount} juegos creados.`);
      } else {
        this.logger.log(`📦 Catálogo ya poblado con ${count} juegos.`);
      }
    } catch (error) {
      this.logger.error('Error durante la verificación/ejecución de auto-seed:', error);
    }
  }

  getHello(): string {
    return 'API REST de Tienda de Videojuegos funcionando correctamente!';
  }

  async manualSeed() {
    return await executeSeed(this.dataSource);
  }
}
