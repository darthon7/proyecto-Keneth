import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
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
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: process.env.APP_HOST || 'localhost',
      port: Number(process.env.APP_PORT) || 3306,
      username: process.env.APP_USERNAME || 'root',
      password: process.env.APP_PASSWORD || '1111',
      database: process.env.APP_DATABASE || 'tienda_videojuegos',
      autoLoadEntities: true,
      synchronize: true, // Ideal para proyectos escolares: sincroniza automáticamente el esquema
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
