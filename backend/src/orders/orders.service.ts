import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import { sanitizeUser } from '../auth/index.js';
import {
  normalizePagination,
  type PaginationOptions,
} from '../common/pagination.util.js';
import { Order, PaymentStatus } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { User } from '../users/entities/user.entity.js';
import { GameEdition } from '../game-editions/entities/game-edition.entity.js';
import { PromotionsService } from '../promotions/promotions.service.js';
import { GamesService } from '../games/games.service.js';
import { CouponRedemption } from '../promotions/entities/coupon-redemption.entity.js';
import { UserLibrary } from '../user-libraries/entities/user-library.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import {
  DigitalKey,
  KeyStatus,
} from '../digital-keys/entities/digital-key.entity.js';

export interface CreateOrderOptions {
  isAdmin?: boolean;
}

interface PreparedOrderItem {
  gameEdition: GameEdition;
  unitPrice: number;
  discountApplied: number;
  subtotal: number;
  digitalKey?: DigitalKey;
}

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    private readonly promotionsService: PromotionsService,

    private readonly gamesService: GamesService,

    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  async create(
    createOrderDto: CreateOrderDto,
    options?: CreateOrderOptions,
  ) {
    const { userId, couponCode, items, paymentStatus, paymentGatewayRef } =
      createOrderDto;

    if (!items || items.length === 0) {
      throw new BadRequestException(
        'Debes agregar al menos un producto a la orden',
      );
    }

    let discountPercent = 0;
    let appliedPromotionId: number | null = null;
    const trimmedCoupon = couponCode?.trim();
    if (trimmedCoupon) {
      const promo = await this.promotionsService.findByCoupon(
        trimmedCoupon,
        userId,
      );
      if (!promo || !promo.isActive) {
        throw new BadRequestException('Cupón inválido o expirado');
      }
      const alreadyClaimed = await this.promotionsService.hasUserClaimed(
        promo.id,
        userId,
      );
      if (alreadyClaimed) {
        throw new BadRequestException(
          'Este cupón ya fue reclamado por tu cuenta (límite de 1 uso por usuario)',
        );
      }
      discountPercent = Number(promo.discountPercentage);
      appliedPromotionId = promo.id;
    }

    const isAdmin = options?.isAdmin === true;
    const effectivePaymentStatus = isAdmin
      ? (paymentStatus ?? PaymentStatus.COMPLETED)
      : PaymentStatus.PENDING;
    const effectivePaymentGatewayRef = isAdmin ? paymentGatewayRef : undefined;

    if (
      effectivePaymentStatus !== PaymentStatus.PENDING &&
      effectivePaymentStatus !== PaymentStatus.COMPLETED
    ) {
      throw new BadRequestException(
        `Estado de pago inválido al crear una orden: ${effectivePaymentStatus}`,
      );
    }

    return await this.dataSource.transaction(async (manager) => {
      const user = await manager.findOneBy(User, { id: userId });
      if (!user) {
        throw new NotFoundException(`El usuario con ID ${userId} no existe`);
      }

      const editionIds = [...new Set(items.map((item) => item.gameEditionId))];
      const preloadedEditions =
        editionIds.length > 0
          ? await manager.find(GameEdition, {
              where: { id: In(editionIds) },
              select: { id: true, gameId: true },
            })
          : [];
      const gameMap = await this.gamesService.findByIdsMap(
        preloadedEditions.map((e) => e.gameId),
      );

      const itemsToSave: PreparedOrderItem[] = [];

      for (const itemDto of items) {
        const quantity = itemDto.quantity ?? 1;
        if (!Number.isInteger(quantity) || quantity < 1) {
          throw new BadRequestException('La cantidad debe ser al menos 1');
        }

        const edition = await manager.findOne(GameEdition, {
          where: { id: itemDto.gameEditionId },
          lock: { mode: 'pessimistic_write' },
        });

        if (!edition) {
          throw new NotFoundException(
            `La edición con ID ${itemDto.gameEditionId} no existe`,
          );
        }

        const game = gameMap.get(edition.gameId);
        const now = new Date();
        const campaignStartOk =
          !game?.discountStartDate || new Date(game.discountStartDate) <= now;
        const campaignEndOk =
          !game?.discountEndDate || new Date(game.discountEndDate) >= now;
        const campaignPercent =
          game &&
          Number(game.discountPercentage) > 0 &&
          campaignStartOk &&
          campaignEndOk
            ? Number(game.discountPercentage)
            : 0;

        const unitPrice = Number(edition.basePrice);
        const priceAfterCampaign = Number(
          (unitPrice * (1 - campaignPercent / 100)).toFixed(2),
        );
        const finalSubtotalPerUnit = Number(
          (priceAfterCampaign * (1 - discountPercent / 100)).toFixed(2),
        );
        const discountPerUnit = Number(
          (unitPrice - finalSubtotalPerUnit).toFixed(2),
        );
        const subtotalPerUnit = finalSubtotalPerUnit;

        const availableKeys = await manager.find(DigitalKey, {
          where: [
            {
              gameEdition: { id: edition.id },
              status: KeyStatus.AVAILABLE,
            },
            {
              gameEdition: { id: edition.id },
              status: KeyStatus.RESERVED,
            },
          ],
          order: { status: 'ASC', id: 'ASC' },
          take: quantity,
          lock: { mode: 'pessimistic_write' },
        });

        if (availableKeys.length < quantity) {
          throw new BadRequestException(
            `No hay suficientes llaves digitales disponibles para la edición ${edition.id}. Solicitado: ${quantity}, Disponible: ${availableKeys.length}`,
          );
        }

        const targetKeyStatus =
          effectivePaymentStatus === PaymentStatus.COMPLETED
            ? KeyStatus.ASSIGNED
            : KeyStatus.RESERVED;

        for (const key of availableKeys) {
          key.status = targetKeyStatus;
          key.reservedUntil = null;
        }
        await manager.save(DigitalKey, availableKeys);

        for (const key of availableKeys) {
          itemsToSave.push({
            gameEdition: edition,
            unitPrice,
            discountApplied: discountPerUnit,
            subtotal: subtotalPerUnit,
            digitalKey: key,
          });
        }
      }

      const totalVenta = Number(
        itemsToSave.reduce((acc, it) => acc + it.subtotal, 0).toFixed(2),
      );

      const nuevaOrden = manager.create(Order, {
        orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        totalAmount: totalVenta,
        paymentStatus: effectivePaymentStatus,
        paymentGatewayRef: effectivePaymentGatewayRef,
        user,
      });

      const ordenGuardada = await manager.save(Order, nuevaOrden);

      if (appliedPromotionId !== null) {
        const existingRedemption = await manager.findOne(CouponRedemption, {
          where: { userId, promotionId: appliedPromotionId },
        });
        if (existingRedemption) {
          throw new BadRequestException(
            'Este cupón ya fue reclamado por tu cuenta (límite de 1 uso por usuario)',
          );
        }
        const redemption = manager.create(CouponRedemption, {
          userId,
          promotionId: appliedPromotionId,
          orderId: ordenGuardada.id,
        });
        await manager.save(CouponRedemption, redemption);
      }

      const itemsGuardados: OrderItem[] = [];
      const libraryEditionIds = new Set<number>();

      for (const itemProc of itemsToSave) {
        const ordenItem = manager.create(OrderItem, {
          order: ordenGuardada,
          gameEdition: itemProc.gameEdition,
          unitPrice: itemProc.unitPrice,
          discountApplied: itemProc.discountApplied,
          subtotal: itemProc.subtotal,
          digitalKey: itemProc.digitalKey,
        });

        const guardado = await manager.save(OrderItem, ordenItem);
        itemsGuardados.push(guardado);

        if (
          ordenGuardada.paymentStatus === PaymentStatus.COMPLETED &&
          !libraryEditionIds.has(itemProc.gameEdition.id)
        ) {
          libraryEditionIds.add(itemProc.gameEdition.id);
          const libEntry = manager.create(UserLibrary, {
            user,
            gameEdition: itemProc.gameEdition,
            order: ordenGuardada,
            isRevoked: false,
          });
          await manager.save(UserLibrary, libEntry);
        }
      }

      return {
        order: this.sanitizeOrderRelations(ordenGuardada),
        items: itemsGuardados,
      };
    });
  }

  async confirmPayment(orderId: number) {
    const confirmedOrder = await this.dataSource.transaction(async (manager) => {
      const lockedOrder = await manager.findOne(Order, {
        where: { id: orderId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!lockedOrder) {
        throw new NotFoundException(`Orden con ID ${orderId} no encontrada`);
      }

      if (lockedOrder.paymentStatus !== PaymentStatus.PENDING) {
        throw new BadRequestException(
          `Solo se pueden confirmar órdenes en estado PENDING (estado actual: ${lockedOrder.paymentStatus})`,
        );
      }

      const orderWithRelations = await manager.findOne(Order, {
        where: { id: orderId },
        relations: {
          user: true,
          items: {
            gameEdition: { platform: true },
            digitalKey: true,
          },
        },
      });

      if (!orderWithRelations) {
        throw new NotFoundException(`Orden con ID ${orderId} no encontrada`);
      }

      lockedOrder.paymentStatus = PaymentStatus.COMPLETED;
      lockedOrder.paymentGatewayRef = `PAY-${Date.now()}-${orderId}`;
      await manager.save(Order, lockedOrder);

      orderWithRelations.paymentStatus = lockedOrder.paymentStatus;
      orderWithRelations.paymentGatewayRef = lockedOrder.paymentGatewayRef;

      const libraryEditionIds = new Set<number>();
      for (const item of orderWithRelations.items ?? []) {
        if (item.digitalKey && item.digitalKey.status === KeyStatus.RESERVED) {
          item.digitalKey.status = KeyStatus.ASSIGNED;
          item.digitalKey.reservedUntil = null;
          await manager.save(DigitalKey, item.digitalKey);
        }

        if (
          item.gameEdition &&
          orderWithRelations.user &&
          !libraryEditionIds.has(item.gameEdition.id)
        ) {
          libraryEditionIds.add(item.gameEdition.id);
          const libEntry = manager.create(UserLibrary, {
            user: orderWithRelations.user,
            gameEdition: item.gameEdition,
            order: lockedOrder,
            isRevoked: false,
          });
          await manager.save(UserLibrary, libEntry);
        }
      }

      return orderWithRelations;
    });

    const [hydrated] = await this.hydrateAndSanitizeOrders([confirmedOrder]);
    return hydrated;
  }

  private sanitizeOrderRelations(order: Order) {
    if (!order.user) {
      return order;
    }
    return {
      ...order,
      user: sanitizeUser(order.user),
    };
  }

  private async hydrateAndSanitizeOrders(orders: Order[]) {
    const gameIds = orders.flatMap((order) =>
      (order.items ?? [])
        .map((item) => item.gameEdition?.gameId)
        .filter((id): id is number => typeof id === 'number'),
    );
    const gameMap = await this.gamesService.findByIdsMap(gameIds);

    return orders.map((order) => {
      const sanitized = this.sanitizeOrderRelations(order);
      if (!order.items) {
        return sanitized;
      }
      return {
        ...sanitized,
        items: order.items.map((item) => {
          if (!item.gameEdition) {
            return item;
          }
          return {
            ...item,
            gameEdition: {
              ...item.gameEdition,
              game: gameMap.get(item.gameEdition.gameId) ?? null,
            },
          };
        }),
      };
    });
  }

  async findAll(pagination?: PaginationOptions) {
    const { take, skip } = normalizePagination(pagination);
    const orders = await this.orderRepository.find({
      relations: {
        user: true,
        items: {
          gameEdition: { platform: true },
          digitalKey: true,
        },
      },
      take,
      skip,
    });
    return await this.hydrateAndSanitizeOrders(orders);
  }

  async findByUser(userId: number, pagination?: PaginationOptions) {
    const { take, skip } = normalizePagination(pagination);
    const orders = await this.orderRepository.find({
      where: { user: { id: userId } },
      relations: {
        user: true,
        items: {
          gameEdition: { platform: true },
          digitalKey: true,
        },
      },
      take,
      skip,
    });
    return await this.hydrateAndSanitizeOrders(orders);
  }

  async findOne(id: number) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        user: true,
        items: {
          gameEdition: { platform: true },
          digitalKey: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    const [hydrated] = await this.hydrateAndSanitizeOrders([order]);
    return hydrated;
  }

  async update(id: number, updateDto: UpdateOrderDto) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        user: true,
        items: {
          gameEdition: { platform: true },
          digitalKey: true,
        },
      },
    });
    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }
    this.orderRepository.merge(order, updateDto);
    const saved = await this.orderRepository.save(order);
    const [hydrated] = await this.hydrateAndSanitizeOrders([saved]);
    return hydrated;
  }

  async remove(id: number) {
    const removedOrder = await this.dataSource.transaction(async (manager) => {
      const lockedOrder = await manager.findOne(Order, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!lockedOrder) {
        throw new NotFoundException(`Orden con ID ${id} no encontrada`);
      }

      const order = await manager.findOne(Order, {
        where: { id },
        relations: {
          user: true,
          items: {
            gameEdition: { platform: true },
            digitalKey: true,
          },
        },
      });
      if (!order) {
        throw new NotFoundException(`Orden con ID ${id} no encontrada`);
      }

      for (const item of order.items ?? []) {
        if (item.digitalKey && item.digitalKey.status === KeyStatus.RESERVED) {
          item.digitalKey.status = KeyStatus.AVAILABLE;
          await manager.save(DigitalKey, item.digitalKey);
        }
      }

      const snapshot = { ...order };
      await manager.remove(Order, order);
      return snapshot as Order;
    });

    const [hydrated] = await this.hydrateAndSanitizeOrders([removedOrder]);
    return hydrated;
  }
}
