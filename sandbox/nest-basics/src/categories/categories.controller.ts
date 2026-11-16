
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

import { CategoriesService } from './categories.service.js';
import { Public } from '../auth/decorators/public.decorator.js';

import { CreateCategoryDto } from './dto/create-category.dto.js';
import { UpdateCategoryDto } from './dto/update-category.dto.js';

import { Roles } from '../common/decorators/roles.decorator.js';
import { UserRole } from '../users/user-role.enum.js';

@Controller('categories')
export class CategoriesController {
  constructor(
    private readonly categoriesService: CategoriesService,
  ) {}

  // Get all categories (no login needed)
  @Public()
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  // Get category by ID (no login needed)
  @Public()
  @Get(':id')
  findOne(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoriesService.findOne(id);
  }

  // Create category (Admin only)
  @Post()
  @Roles(UserRole.ADMIN)
  create(
    @Body() dto: CreateCategoryDto,
  ) {
    return this.categoriesService.create(dto);
  }

  // Update category (Admin only)
  @Patch(':id')
  @Roles(UserRole.ADMIN)
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoriesService.update(id, dto);
  }

  // Delete category (Admin only)
  // BUG FIX: this route had no @Roles, so ANY logged-in user could delete.
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  remove(
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.categoriesService.remove(id);
  }
}
