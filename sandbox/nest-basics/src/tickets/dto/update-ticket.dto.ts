import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { TicketPriority } from '../ticket-priority.enum.js';

export class UpdateTicketDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  category?: number;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}