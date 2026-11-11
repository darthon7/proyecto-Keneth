import { PartialType } from '@nestjs/mapped-types';
import { CreatePublisherDto } from './create-publisher.dto.js';

export class UpdatePublisherDto extends PartialType(CreatePublisherDto) {}
