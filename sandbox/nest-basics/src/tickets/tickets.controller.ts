import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from '@nestjs/common';

import { TicketsService } from './tickets.service.js';
import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';
import { UpdateStatusDto } from './dto/update-status.dto.js';
import { AssignTicketDto } from './dto/assign-ticket.dto.js';

import { AuthUser } from '../auth/decorators/auth-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../users/user-role.enum.js';
import type { AuthenticatedUser } from '../common/interfaces/authenticated-user.interface.js';

@Controller('tickets')
export class TicketsController {
  constructor(
    private readonly ticketsService: TicketsService,
  ) {}

  // Users raise tickets; Admin can too. Agents only work on them.
  @Post()
  @Roles(UserRole.ADMIN, UserRole.USER)
  create(
    @Body() dto: CreateTicketDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.create(dto, user.id);
  }

  // Everyone; the service filters: User -> own, Agent -> assigned, Admin -> all
  @Get()
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.USER)
  findAll(@AuthUser() user: AuthenticatedUser) {
    return this.ticketsService.findAll(user);
  }

  // Everyone; the service checks you own / are assigned / are Admin
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.AGENT, UserRole.USER)
  findOne(
    @Param('id', ParseIntPipe) id: number,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.findOne(id, user);
  }

  // Edit title/description: the creator (User) or Admin
  @Patch(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.update(id, dto, user);
  }

  // Change status: Agent working on it, or Admin
  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.AGENT)
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateStatusDto,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.updateStatus(
      id,
      dto.status,
      user,
    );
  }

  // Assign to an agent: Admin only
  @Patch(':id/assign')
  @Roles(UserRole.ADMIN)
  assign(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AssignTicketDto,
  ) {
    return this.ticketsService.assign(id, dto.assignedTo);
  }

  // Delete: the creator (User) or Admin
  @Delete(':id')
  @Roles(UserRole.ADMIN, UserRole.USER)
  remove(
    @Param('id', ParseIntPipe) id: number,
    @AuthUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.remove(id, user);
  }
}