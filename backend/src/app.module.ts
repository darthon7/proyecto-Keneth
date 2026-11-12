import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';

// Módulos del Catálogo Base y Metadatos
import { PublishersModule } from './publishers/publishers.module.js';
import { DevelopersModule } from './developers/developers.module.js';
import { GenresModule } from './genres/genres.module.js';
import { PlatformsModule } from './platforms/platforms.module.js';

// Videojuegos, Ediciones y Requisitos
import { GamesModule } from './games/games.module.js';
import { SystemRequirementsModule } from './system-requirements/system-requirements.module.js';
import { GameEditionsModule } from './game-editions/game-editions.module.js';

// Inventario de Claves y Promociones
import { DigitalKeysModule } from './digital-keys/digital-keys.module.js';
import { PromotionsModule } from './promotions/promotions.module.js';

// Usuarios, Órdenes y Comunidad
import { UsersModule } from './users/users.module.js';
import { OrdersModule } from './orders/orders.module.js';
import { UserLibrariesModule } from './user-libraries/user-libraries.module.js';
import { WishlistsModule } from './wishlists/wishlists.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const databaseUrl = config.get<string>('DATABASE_URL');
        if (databaseUrl) {
          // Conexión Serverless Neon PostgreSQL (Producción / Render)
          return {
            type: 'postgres',
            url: databaseUrl,
            ssl: { rejectUnauthorized: false },
            autoLoadEntities: true,
            synchronize: true,
          };
        }

        // Conexión por variables individuales (MySQL local o PostgreSQL)
        const dbType = (config.get<string>('APP_TYPE') || 'mysql') as 'mysql' | 'postgres';
        return {
          type: dbType,
          host: config.get<string>('APP_HOST', 'localhost'),
          port: Number(config.get<number>('APP_PORT', dbType === 'postgres' ? 5432 : 3306)),
          username: config.get<string>('APP_USERNAME', 'root'),
          password: config.get<string>('APP_PASSWORD', '1111'),
          database: config.get<string>('APP_DATABASE', 'tienda_videojuegos'),
          ssl: dbType === 'postgres' ? { rejectUnauthorized: false } : false,
          autoLoadEntities: true,
          synchronize: true,
        };
      },
    }),
    PublishersModule,
    DevelopersModule,
    GenresModule,
    PlatformsModule,
    GamesModule,
    SystemRequirementsModule,
    GameEditionsModule,
    DigitalKeysModule,
    PromotionsModule,
    UsersModule,
    OrdersModule,
    UserLibrariesModule,
    WishlistsModule,
    ReviewsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
