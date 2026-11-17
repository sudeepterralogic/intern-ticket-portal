import { IsEnum } from 'class-validator';

import { TicketStatus } from '../ticket-status.enum.js';

export class UpdateStatusDto {
  @IsEnum(TicketStatus)
  status: TicketStatus;
}