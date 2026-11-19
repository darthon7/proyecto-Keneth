import { Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import { GamesService } from './games/games.service.js';
import { Developer } from './developers/entities/developer.entity.js';
import { DigitalKey, KeyStatus } from './digital-keys/entities/digital-key.entity.js';
import { Order, PaymentStatus } from './orders/entities/order.entity.js';
import { Promotion } from './promotions/entities/promotion.entity.js';
import { User } from './users/entities/user.entity.js';
import { executeSeed } from './database/seed.js';

@Injectable()
export class AppService implements OnApplicationBootstrap {
  private readonly logger = new Logger(AppService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly gamesService: GamesService,
  ) {}

  async onApplicationBootstrap() {
    try {
      const count = await this.gamesService.count();
      if (count === 0) {
        this.logger.log(
          'Base de datos vacía detectada. Iniciando auto-seeding de catálogo...',
        );
        const result = await executeSeed(
          this.dataSource,
          this.gamesService.getMongoModels(),
        );
        this.logger.log(
          `Auto-seeding completado: ${result.createdCount} juegos creados.`,
        );
      } else {
        this.logger.log(`Catálogo ya poblado con ${count} juegos.`);
      }
    } catch (error) {
      this.logger.error(
        'Error durante la verificación/ejecución de auto-seed:',
        error,
      );
    }
  }

  getHello(): string {
    return 'API REST de Tienda de Videojuegos funcionando correctamente!';
  }

  async manualSeed() {
    return await executeSeed(
      this.dataSource,
      this.gamesService.getMongoModels(),
    );
  }

  async getAdminSummary() {
    const now = new Date();
    const [
      games,
      developers,
      digitalKeys,
      availableKeys,
      orders,
      completedOrders,
      promotions,
      activePromotions,
      users,
    ] = await Promise.all([
      this.gamesService.count(),
      this.dataSource.getRepository(Developer).count(),
      this.dataSource.getRepository(DigitalKey).count(),
      this.dataSource
        .getRepository(DigitalKey)
        .count({ where: { status: KeyStatus.AVAILABLE } }),
      this.dataSource.getRepository(Order).count(),
      this.dataSource
        .getRepository(Order)
        .count({ where: { paymentStatus: PaymentStatus.COMPLETED } }),
      this.dataSource.getRepository(Promotion).count(),
      this.dataSource.getRepository(Promotion).count({
        where: {
          isActive: true,
          startDate: LessThanOrEqual(now),
          endDate: MoreThanOrEqual(now),
        },
      }),
      this.dataSource.getRepository(User).count(),
    ]);

    return {
      games,
      developers,
      digitalKeys,
      availableKeys,
      orders,
      completedOrders,
      promotions,
      activePromotions,
      users,
    };
  }
}
