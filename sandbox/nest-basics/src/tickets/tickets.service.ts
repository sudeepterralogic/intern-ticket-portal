import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateTicketDto } from './dto/create-ticket.dto.js';
import { UpdateTicketDto } from './dto/update-ticket.dto.js';

import { TicketStatus } from './ticket-status.enum.js';
import { UserRole } from '../users/user-role.enum.js';

type AuthenticatedUser = {
  id: number;
  role: UserRole;
};

const ticketRelations = {
  category: true,
  createdBy: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  assignedTo: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
} as const;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Create ticket
  async create(dto: CreateTicketDto, userId: number) {
    // Without this, a bad category id fails the foreign key -> 500
    const category = await this.prisma.category.findUnique({
      where: { id: dto.category },
    });

    if (!category) {
      throw new BadRequestException('Category not found');
    }

    return this.prisma.ticket.create({
      data: {
        title: dto.title,
        description: dto.description,
        categoryId: dto.category,
        priority: dto.priority ?? 'MEDIUM',
        status: 'OPEN',
        createdById: userId,
      },
      include: ticketRelations,
    });
  }

  // Get all tickets
  async findAll(user: AuthenticatedUser) {
    const where =
      user.role === UserRole.USER
        ? { createdById: user.id }
        : user.role === UserRole.AGENT
          ? { assignedToId: user.id }
          : {};

    return this.prisma.ticket.findMany({
      where,
      include: ticketRelations,
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get one ticket
  async findOne(id: number, user: AuthenticatedUser) {
    const ticket = await this.getTicket(id);

    this.checkReadAccess(ticket, user);

    return ticket;
  }

  // Update ticket
  async update(
    id: number,
    dto: UpdateTicketDto,
    user: AuthenticatedUser,
  ) {
    const ticket = await this.getTicket(id);

    if (
      user.role !== UserRole.ADMIN &&
      ticket.createdById !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot update this ticket',
      );
    }

    return this.prisma.ticket.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && {
          title: dto.title,
        }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.category !== undefined && {
          categoryId: dto.category,
        }),
        ...(dto.priority !== undefined && {
          priority: dto.priority,
        }),
      },
      include: ticketRelations,
    });
  }

  // Update ticket status
  async updateStatus(
    id: number,
    status: TicketStatus,
    user: AuthenticatedUser,
  ) {
    const ticket = await this.getTicket(id);

    const isAdmin = user.role === UserRole.ADMIN;

    const isAssignedAgent =
      user.role === UserRole.AGENT &&
      ticket.assignedToId === user.id;

    if (!isAdmin && !isAssignedAgent) {
      throw new ForbiddenException(
        'Only an Admin or the assigned Agent can update ticket status',
      );
    }

    return this.prisma.ticket.update({
      where: { id },
      data: { status },
      include: ticketRelations,
    });
  }

  // Assign ticket (assignedTo = null -> unassign)
  async assign(id: number, assignedTo: number | null) {
    const ticket = await this.getTicket(id);

    if (assignedTo !== null) {
      const agent = await this.prisma.user.findUnique({
        where: { id: assignedTo },
      });

      if (!agent) {
        throw new NotFoundException('User not found');
      }

      if (agent.role !== UserRole.AGENT) {
        throw new ForbiddenException(
          'Ticket can only be assigned to an Agent',
        );
      }

      if (!agent.isActive) {
        throw new BadRequestException(
          'Ticket cannot be assigned to an inactive Agent',
        );
      }
    }

    return this.prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        assignedToId: assignedTo,
      },
      include: ticketRelations,
    });
  }

  // Delete ticket
  async remove(id: number, user: AuthenticatedUser) {
    const ticket = await this.getTicket(id);

    if (
      user.role !== UserRole.ADMIN &&
      ticket.createdById !== user.id
    ) {
      throw new ForbiddenException(
        'You cannot delete this ticket',
      );
    }

    await this.prisma.ticket.delete({
      where: { id },
    });

    return {
      message: 'Ticket deleted successfully',
    };
  }

  // Find ticket by ID
  private async getTicket(id: number) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: ticketRelations,
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return ticket;
  }

  // Check ticket read permission
  private checkReadAccess(
    ticket: Awaited<ReturnType<TicketsService['getTicket']>>,
    user: AuthenticatedUser,
  ) {
    const isAdmin = user.role === UserRole.ADMIN;

    const isCreator = ticket.createdById === user.id;

    const isAssignedAgent =
      user.role === UserRole.AGENT &&
      ticket.assignedToId === user.id;

    if (!isAdmin && !isCreator && !isAssignedAgent) {
      throw new ForbiddenException(
        'You cannot view this ticket',
      );
    }
  }
}