import { PartialType } from '@nestjs/mapped-types';
import { CreatePlatformDto } from './create-platform.dto.js';

export class UpdatePlatformDto extends PartialType(CreatePlatformDto) {}
