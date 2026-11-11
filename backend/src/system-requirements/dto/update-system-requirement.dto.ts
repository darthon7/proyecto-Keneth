import { PartialType } from '@nestjs/mapped-types';
import { CreateSystemRequirementDto } from './create-system-requirement.dto.js';

export class UpdateSystemRequirementDto extends PartialType(
  CreateSystemRequirementDto,
) {}
