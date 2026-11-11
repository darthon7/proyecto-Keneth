import { PartialType } from '@nestjs/mapped-types';
import { CreateWishlistDto } from './create-wishlist.dto.js';

export class UpdateWishlistDto extends PartialType(CreateWishlistDto) {}
