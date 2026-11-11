import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Order } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { User } from '../users/entities/user.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { UserLibrary } from '../user-libraries/entities/user-library.entity.js';
import { GameEditionsModule } from '../game-editions/game-editions.module.js';
import { DigitalKeysModule } from '../digital-keys/digital-keys.module.js';
import { PromotionsModule } from '../promotions/promotions.module.js';
import { OrdersService } from './orders.service.js';
import { OrdersController } from './orders.controller.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      User,
      GameEdition,
      UserLibrary,
    ]),
    GameEditionsModule,
    DigitalKeysModule,
    PromotionsModule,
  ],
  controllers: [OrdersController],
  providers: [OrdersService],
  exports: [OrdersService],
})
export class OrdersModule {}
