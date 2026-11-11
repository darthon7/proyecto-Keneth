import { PartialType } from '@nestjs/mapped-types';
import { CreateUserLibraryDto } from './create-user-library.dto.js';

export class UpdateUserLibraryDto extends PartialType(CreateUserLibraryDto) {}
