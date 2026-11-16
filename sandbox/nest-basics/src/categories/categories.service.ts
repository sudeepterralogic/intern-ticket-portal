
import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  // Create category
  async create(dto: CreateCategoryDto) {
    const existingCategory =
      await this.prisma.category.findFirst({
        where: { name: dto.name },
      });

    if (existingCategory) {
      throw new ConflictException(
        'Category already exists',
      );
    }

    try {
      return await this.prisma.category.create({
        data: {
          name: dto.name,
          description: dto.description,
        },
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException(
          'Category already exists',
        );
      }

      throw error;
    }
  }

  // Get all categories
  async findAll() {
    return this.prisma.category.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Get one category
  async findOne(id: number) {
    const category =
      await this.prisma.category.findUnique({
        where: { id },
      });

    if (!category) {
      throw new NotFoundException(
        'Category not found',
      );
    }

    return category;
  }

  // Update category
  async update(
    id: number,
    dto: UpdateCategoryDto,
  ) {
    await this.findOne(id);

    if (dto.name !== undefined) {
      const existingCategory =
        await this.prisma.category.findFirst({
          where: { name: dto.name },
        });

      if (
        existingCategory &&
        existingCategory.id !== id
      ) {
        throw new ConflictException(
          'Category name already exists',
        );
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && {
          name: dto.name,
        }),
        ...(dto.description !== undefined && {
          description: dto.description,
        }),
        ...(dto.isActive !== undefined && {
          isActive: dto.isActive,
        }),
      },
    });
  }

  // Delete category
  async remove(id: number) {
    await this.findOne(id);

    try {
      await this.prisma.category.delete({
        where: { id },
      });
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        error.code === 'P2003'
      ) {
        throw new ConflictException(
          'Cannot delete category because tickets are associated with it',
        );
      }

      throw error;
    }

    return {
      message: 'Category deleted successfully',
    };
  }
}
