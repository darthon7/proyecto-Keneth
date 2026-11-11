import { PartialType } from '@nestjs/mapped-types';
import { CreateDigitalKeyDto } from './create-digital-key.dto.js';

export class UpdateDigitalKeyDto extends PartialType(CreateDigitalKeyDto) {}
