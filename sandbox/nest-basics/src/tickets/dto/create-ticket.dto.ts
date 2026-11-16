import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { TicketPriority } from '../ticket-priority.enum.js';

export class CreateTicketDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  description: string;

  @IsInt()
  @Min(1)
  category: number;

  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;
}