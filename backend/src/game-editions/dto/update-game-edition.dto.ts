import { PartialType } from '@nestjs/mapped-types';
import { CreateGameEditionDto } from './create-game-edition.dto.js';

export class UpdateGameEditionDto extends PartialType(CreateGameEditionDto) {}
