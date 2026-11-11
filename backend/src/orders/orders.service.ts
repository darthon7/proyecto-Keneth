import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order, PaymentStatus } from './entities/order.entity.js';
import { OrderItem } from './entities/order-item.entity.js';
import { User } from '../users/entities/user.entity.js';
import { GameEdition, EditionFormat } from '../game-editions/entities/game-edition.entity.js';
import { GameEditionsService } from '../game-editions/game-editions.service.js';
import { DigitalKeysService } from '../digital-keys/digital-keys.service.js';
import { PromotionsService } from '../promotions/promotions.service.js';
import { UserLibrary } from '../user-libraries/entities/user-library.entity.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';
import { DigitalKey } from '../digital-keys/entities/digital-key.entity.js';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,

    @InjectRepository(OrderItem)
    private readonly orderItemRepository: Repository<OrderItem>,

    @InjectRepository(User)
    private readonly userRepository: Repository<User>,

    @InjectRepository(GameEdition)
    private readonly editionRepository: Repository<GameEdition>,

    @InjectRepository(UserLibrary)
    private readonly libraryRepository: Repository<UserLibrary>,

    private readonly gameEditionsService: GameEditionsService,
    private readonly digitalKeysService: DigitalKeysService,
    private readonly promotionsService: PromotionsService,
  ) {}

  async create(createOrderDto: CreateOrderDto) {
    const { userId, couponCode, items, paymentStatus, paymentGatewayRef } =
      createOrderDto;

    const user = await this.userRepository.findOneBy({ id: userId });
    if (!user) {
      throw new NotFoundException(`El usuario con ID ${userId} no existe`);
    }

    if (!items || items.length === 0) {
      throw new BadRequestException('Debes agregar al menos un producto a la orden');
    }

    // Comprobar si hay cupón de descuento activo
    let discountPercent = 0;
    if (couponCode) {
      const promo = await this.promotionsService.findByCoupon(couponCode);
      if (promo && promo.isActive) {
        discountPercent = Number(promo.discountPercentage);
      }
    }

    const itemsAProcesar: {
      gameEdition: GameEdition;
      quantity: number;
      unitPrice: number;
      discountApplied: number;
      subtotal: number;
      digitalKey?: DigitalKey;
    }[] = [];

    // Validar existencias y preparar líneas de pedido
    for (const itemDto of items) {
      const edition = await this.editionRepository.findOne({
        where: { id: itemDto.gameEditionId },
        relations: { game: true, platform: true },
      });

      if (!edition) {
        throw new NotFoundException(
          `La edición con ID ${itemDto.gameEditionId} no existe`,
        );
      }

      const quantity = itemDto.quantity ?? 1;

      let keyAsignada: DigitalKey | undefined = undefined;

      if (edition.format === EditionFormat.PHYSICAL) {
        if (edition.stockPhysical < quantity) {
          throw new BadRequestException(
            `Stock físico insuficiente para '${edition.editionName}'. Disponible: ${edition.stockPhysical}`,
          );
        }
        await this.gameEditionsService.descontarStockFisico(edition.id, quantity);
      } else {
        // Digital: Asignar clave si el pago es exitoso
        keyAsignada = await this.digitalKeysService.obtenerLlaveDisponible(
          edition.id,
        );
        await this.digitalKeysService.marcarComoAsignada(keyAsignada.id);
      }

      const unitPrice = Number(edition.basePrice);
      const discount = (unitPrice * discountPercent) / 100;
      const subtotal = (unitPrice - discount) * quantity;

      itemsAProcesar.push({
        gameEdition: edition,
        quantity,
        unitPrice,
        discountApplied: discount * quantity,
        subtotal,
        digitalKey: keyAsignada,
      });
    }

    const totalVenta = itemsAProcesar.reduce((acc, it) => acc + it.subtotal, 0);

    const nuevaOrden = this.orderRepository.create({
      orderNumber: `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      totalAmount: totalVenta,
      paymentStatus: paymentStatus ?? PaymentStatus.COMPLETED,
      paymentGatewayRef: paymentGatewayRef ?? undefined,
      user,
    });

    const ordenGuardada: Order = await this.orderRepository.save(nuevaOrden);

    const itemsGuardados: OrderItem[] = [];
    for (const itemProc of itemsAProcesar) {
      const ordenItem = this.orderItemRepository.create({
        order: ordenGuardada,
        gameEdition: itemProc.gameEdition,
        unitPrice: itemProc.unitPrice,
        discountApplied: itemProc.discountApplied,
        subtotal: itemProc.subtotal,
        digitalKey: itemProc.digitalKey,
      });

      const guardado: OrderItem = await this.orderItemRepository.save(ordenItem);
      itemsGuardados.push(guardado);

      // Si es digital o completado, se agrega a la biblioteca del usuario
      if (ordenGuardada.paymentStatus === PaymentStatus.COMPLETED) {
        const libEntry = this.libraryRepository.create({
          user,
          gameEdition: itemProc.gameEdition,
          order: ordenGuardada,
          isRevoked: false,
        });
        await this.libraryRepository.save(libEntry);
      }
    }

    return {
      order: ordenGuardada,
      items: itemsGuardados,
    };
  }

  async findAll() {
    return await this.orderRepository.find({
      relations: {
        user: true,
        items: {
          gameEdition: { game: true, platform: true },
          digitalKey: true,
        },
      },
    });
  }

  async findOne(id: number) {
    const order = await this.orderRepository.findOne({
      where: { id },
      relations: {
        user: true,
        items: {
          gameEdition: { game: true, platform: true },
          digitalKey: true,
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Orden con ID ${id} no encontrada`);
    }

    return order;
  }

  async update(id: number, updateDto: UpdateOrderDto) {
    const order = await this.findOne(id);
    this.orderRepository.merge(order, updateDto);
    return await this.orderRepository.save(order);
  }

  async remove(id: number) {
    const order = await this.findOne(id);

    // Devolver stock si era físico
    for (const item of order.items) {
      if (item.gameEdition.format === EditionFormat.PHYSICAL) {
        await this.gameEditionsService.devolverStockFisico(
          item.gameEdition.id,
          1,
        );
      }
    }

    return await this.orderRepository.remove(order);
  }
}
