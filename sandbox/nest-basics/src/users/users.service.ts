import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import * as bcrypt from 'bcrypt';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateUserDto } from './dto/create-user.dto.js';
import { UpdateUserDto } from './dto/update-user.dto.js';
import { ListUsersQueryDto } from './dto/list-users-query.dto.js';

// The only fields ever sent back to the client.
// `password` (the bcrypt hash) is deliberately NOT here.
const publicUserFields = {
  id: true,
  name: true,
  username: true,
  email: true,
  role: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const SALT_ROUNDS = 10;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // GET /users?page=1&limit=10&search=john&role=Agent
  async findAll(query: ListUsersQueryDto) {
    const { page, limit, search, role } = query;

    const where = {
      ...(role && { role }),
      ...(search && {
        OR: [
          { name: { contains: search } },
          { username: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const [data, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: publicUserFields,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.user.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // GET /users/:id -> 404 if not found
  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserFields,
    });

    if (!user) {
      throw new NotFoundException(`User with id ${id} not found`);
    }

    return user;
  }

  // Used by AuthService only (needs the password hash to compare)
  async findByEmailForAuth(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  // Used by AuthService only (needs the password hash to compare)
  async findByUsernameForAuth(username: string) {
    return this.prisma.user.findUnique({
      where: { username },
    });
  }

  // POST /users -> 409 if email/username already exists
  async create(dto: CreateUserDto) {
    await this.ensureUnique(dto.email, dto.username);

    const hashedPassword = await bcrypt.hash(dto.password, SALT_ROUNDS);

    try {
      return await this.prisma.user.create({
        data: {
          name: dto.name,
          username: dto.username,
          email: dto.email,
          password: hashedPassword,
          ...(dto.role && { role: dto.role }),
        },
        select: publicUserFields,
      });
    } catch (error) {
      // Two requests at the same time can both pass ensureUnique()
      throw this.toConflict(error);
    }
  }

  // PUT /users/:id -> 404 if not found, 409 if email/username taken
  async update(id: number, dto: UpdateUserDto) {
    await this.findOne(id);
    await this.ensureUnique(dto.email, dto.username, id);

    const data: {
      name?: string;
      username?: string;
      email?: string;
      password?: string;
      role?: UpdateUserDto['role'];
    } = {};

    if (dto.name !== undefined) data.name = dto.name;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.email !== undefined) data.email = dto.email;
    if (dto.role !== undefined) data.role = dto.role;

    if (dto.password !== undefined) {
      data.password = await bcrypt.hash(dto.password, SALT_ROUNDS);
    }

    try {
      return await this.prisma.user.update({
        where: { id },
        data,
        select: publicUserFields,
      });
    } catch (error) {
      throw this.toConflict(error);
    }
  }

  // DELETE /users/:id -> 404 if not found
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.user.delete({
      where: { id },
      select: publicUserFields,
    });
  }

  // Throws 409 if another user already has this email or username
  private async ensureUnique(
    email?: string,
    username?: string,
    excludeId?: number,
  ) {
    if (email) {
      const existing = await this.prisma.user.findUnique({ where: { email } });
      if (existing && existing.id !== excludeId) {
        throw new ConflictException('Email already exists');
      }
    }

    if (username) {
      const existing = await this.prisma.user.findUnique({ where: { username } });
      if (existing && existing.id !== excludeId) {
        throw new ConflictException('Username already exists');
      }
    }
  }

  // Turns Prisma's unique-constraint error (P2002) into a 409
  private toConflict(error: unknown) {
    if (
      error &&
      typeof error === 'object' &&
      'code' in error &&
      error.code === 'P2002'
    ) {
      return new ConflictException('Email or username already exists');
    }
    return error;
  }
}
