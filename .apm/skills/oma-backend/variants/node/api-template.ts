/**
 * API Endpoint Template for Backend Agent (Node.js / NestJS)
 *
 * Demonstrates the Router -> Service -> Repository pattern
 * using NestJS, Prisma, and Zod validation.
 *
 * File layout (split into real modules in production):
 *   src/modules/resources/
 *     resources.controller.ts   <- this file (controller + decorators)
 *     resources.service.ts      <- business logic
 *     resources.repository.ts   <- Prisma data access
 *     dto/resource.dto.ts       <- Zod schemas + inferred types
 *     resources.module.ts       <- DI wiring
 */

// ---------------------------------------------------------------------------
// dto/resource.dto.ts
// ---------------------------------------------------------------------------

import { z } from 'zod';

export const CreateResourceSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'archived']).default('active'),
});

export const UpdateResourceSchema = CreateResourceSchema.partial();

export const ResourceQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
  status: z.enum(['active', 'archived']).optional(),
});

export type CreateResourceDto = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceDto = z.infer<typeof UpdateResourceSchema>;
export type ResourceQueryDto = z.infer<typeof ResourceQuerySchema>;

// ---------------------------------------------------------------------------
// resources.repository.ts
// ---------------------------------------------------------------------------

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma, Resource } from '@prisma/client';

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

@Injectable()
export class ResourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findPaginated(
    userId: string,
    query: ResourceQueryDto,
  ): Promise<PaginatedResult<Resource>> {
    const { page, limit, search, status } = query;

    const where: Prisma.ResourceWhereInput = {
      userId,
      deletedAt: null,
      ...(status && { status }),
      ...(search && {
        title: { contains: search, mode: 'insensitive' },
      }),
    };

    // Single round-trip with $transaction
    const [items, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.resource.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string, userId: string): Promise<Resource | null> {
    return this.prisma.resource.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  async create(
    userId: string,
    data: CreateResourceDto,
  ): Promise<Resource> {
    return this.prisma.resource.create({
      data: {
        ...data,
        user: { connect: { id: userId } },
      },
    });
  }

  async update(id: string, data: UpdateResourceDto): Promise<Resource> {
    return this.prisma.resource.update({
      where: { id },
      data,
    });
  }

  async softDelete(id: string): Promise<Resource> {
    return this.prisma.resource.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

// ---------------------------------------------------------------------------
// resources.service.ts
// ---------------------------------------------------------------------------

import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';

@Injectable()
export class ResourcesService {
  constructor(private readonly resourcesRepo: ResourcesRepository) {}

  async findAll(
    userId: string,
    query: ResourceQueryDto,
  ): Promise<PaginatedResult<Resource>> {
    return this.resourcesRepo.findPaginated(userId, query);
  }

  async findOne(id: string, userId: string): Promise<Resource> {
    const resource = await this.resourcesRepo.findOne(id, userId);
    if (!resource) {
      throw new NotFoundException(`Resource ${id} not found`);
    }
    // Guard against cross-user access (belt-and-suspenders; repo already filters)
    if (resource.userId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return resource;
  }

  async create(dto: CreateResourceDto, userId: string): Promise<Resource> {
    return this.resourcesRepo.create(userId, dto);
  }

  async update(
    id: string,
    dto: UpdateResourceDto,
    userId: string,
  ): Promise<Resource> {
    await this.findOne(id, userId); // ownership check raises 404/403 as needed
    return this.resourcesRepo.update(id, dto);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId); // ownership check
    await this.resourcesRepo.softDelete(id);
  }
}

// ---------------------------------------------------------------------------
// common/decorators/current-user.decorator.ts
// ---------------------------------------------------------------------------

import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@prisma/client';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<{ user: User }>();
    return request.user;
  },
);

// ---------------------------------------------------------------------------
// resources.controller.ts  (Router layer — NO business logic here)
// ---------------------------------------------------------------------------

import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  UsePipes,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';

@Controller('api/resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  /**
   * GET /api/resources?page=1&limit=20&search=foo&status=active
   */
  @Get()
  findAll(
    @Query(new ZodValidationPipe(ResourceQuerySchema)) query: ResourceQueryDto,
    @CurrentUser() user: User,
  ): Promise<PaginatedResult<Resource>> {
    return this.resourcesService.findAll(user.id, query);
  }

  /**
   * GET /api/resources/:id
   */
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<Resource> {
    return this.resourcesService.findOne(id, user.id);
  }

  /**
   * POST /api/resources
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UsePipes(new ZodValidationPipe(CreateResourceSchema))
  create(
    @Body() dto: CreateResourceDto,
    @CurrentUser() user: User,
  ): Promise<Resource> {
    return this.resourcesService.create(dto, user.id);
  }

  /**
   * PATCH /api/resources/:id
   */
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body(new ZodValidationPipe(UpdateResourceSchema)) dto: UpdateResourceDto,
    @CurrentUser() user: User,
  ): Promise<Resource> {
    return this.resourcesService.update(id, dto, user.id);
  }

  /**
   * DELETE /api/resources/:id  (soft delete)
   */
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ): Promise<void> {
    return this.resourcesService.remove(id, user.id);
  }
}

// ---------------------------------------------------------------------------
// resources.module.ts
// ---------------------------------------------------------------------------

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResourcesController],
  providers: [ResourcesService, ResourcesRepository],
  exports: [ResourcesService],
})
export class ResourcesModule {}

// ---------------------------------------------------------------------------
// common/pipes/zod-validation.pipe.ts
// ---------------------------------------------------------------------------

import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown): unknown {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        message: 'Validation failed',
        errors: result.error.flatten(),
      });
    }
    return result.data;
  }
}
