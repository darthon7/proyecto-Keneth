import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ForbiddenException,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  type AuthenticatedUser,
  CurrentUser,
  JwtAuthGuard,
} from '../auth/index.js';
import { Roles, RolesGuard } from '../common/auth/index.js';
import { UserRole } from '../users/entities/user-role.enum.js';
import { OrdersService } from './orders.service.js';
import { CreateOrderDto } from './dto/create-order.dto.js';
import { UpdateOrderDto } from './dto/update-order.dto.js';

@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (
      currentUser.role !== UserRole.ADMIN &&
      createOrderDto.userId !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para crear órdenes para otro usuario',
      );
    }
    return this.ordersService.create(createOrderDto, {
      isAdmin: currentUser.role === UserRole.ADMIN,
    });
  }

  @Post(':id/confirm-payment')
  async confirmPayment(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const order = await this.ordersService.findOne(id);
    if (
      currentUser.role !== UserRole.ADMIN &&
      order.user?.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para confirmar el pago de esta orden',
      );
    }
    return this.ordersService.confirmPayment(id);
  }

  @Get()
  findAll(
    @CurrentUser() currentUser: AuthenticatedUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    if (currentUser.role === UserRole.ADMIN) {
      return this.ordersService.findAll({ limit, offset });
    }
    return this.ordersService.findByUser(currentUser.id, { limit, offset });
  }

  @Get('user/:userId')
  findByUser(
    @Param('userId', ParseIntPipe) userId: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    if (currentUser.role !== UserRole.ADMIN && currentUser.id !== userId) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a las órdenes de este usuario',
      );
    }
    return this.ordersService.findByUser(userId);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() currentUser: AuthenticatedUser,
  ) {
    const order = await this.ordersService.findOne(id);
    if (
      currentUser.role !== UserRole.ADMIN &&
      order.user?.id !== currentUser.id
    ) {
      throw new ForbiddenException(
        'No tienes permisos para acceder a esta orden',
      );
    }
    return order;
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateOrderDto,
  ) {
    return this.ordersService.update(id, updateOrderDto);
  }

  @Roles(UserRole.ADMIN)
  @UseGuards(RolesGuard)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.remove(id);
  }
}
