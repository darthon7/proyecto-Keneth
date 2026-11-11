import { PartialType } from '@nestjs/mapped-types';
import { CreateDeveloperDto } from './create-developer.dto.js';

export class UpdateDeveloperDto extends PartialType(CreateDeveloperDto) {}
