# Backend Agent - Code Snippets (Node.js / NestJS)

Copy-paste ready patterns. Use these as starting points, adapt to the specific task.

---

## 1. NestJS Controller with Auth Guard

```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseUUIDPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { ResourcesService } from './resources.service';
import { CreateResourceDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import { User } from '@prisma/client';

@Controller('api/resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(private readonly resourcesService: ResourcesService) {}

  @Get()
  findAll(@CurrentUser() user: User) {
    return this.resourcesService.findAll(user.id);
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.resourcesService.findOne(id, user.id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  create(
    @Body() dto: CreateResourceDto,
    @CurrentUser() user: User,
  ) {
    return this.resourcesService.create(dto, user.id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateResourceDto,
    @CurrentUser() user: User,
  ) {
    return this.resourcesService.update(id, dto, user.id);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: User,
  ) {
    return this.resourcesService.remove(id, user.id);
  }
}
```

---

## 2. Zod Schema Validation

```typescript
import { z } from 'zod';

// Schema definitions
export const CreateResourceSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  status: z.enum(['active', 'archived']).default('active'),
});

export const UpdateResourceSchema = CreateResourceSchema.partial();

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().optional(),
});

// Inferred TypeScript types
export type CreateResourceDto = z.infer<typeof CreateResourceSchema>;
export type UpdateResourceDto = z.infer<typeof UpdateResourceSchema>;
export type PaginationDto = z.infer<typeof PaginationSchema>;

// NestJS pipe for Zod validation
import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import { ZodSchema } from 'zod';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodSchema) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException(result.error.flatten());
    }
    return result.data;
  }
}
```

---

## 3. Prisma Model Example

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String     @id @default(uuid()) @db.Uuid
  email     String     @unique
  password  String
  resources Resource[]
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")

  @@map("users")
}

model Resource {
  id          String    @id @default(uuid()) @db.Uuid
  title       String    @db.VarChar(200)
  description String?   @db.Text
  status      String    @default("active") @db.VarChar(20)
  userId      String    @map("user_id") @db.Uuid
  user        User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  deletedAt   DateTime? @map("deleted_at")

  @@index([userId])
  @@map("resources")
}
```

---

## 4. NestJS Module with DI

```typescript
import { Module } from '@nestjs/common';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';
import { ResourcesRepository } from './resources.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ResourcesController],
  providers: [ResourcesService, ResourcesRepository],
  exports: [ResourcesService],
})
export class ResourcesModule {}

// prisma/prisma.module.ts
import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}

// prisma/prisma.service.ts
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
```

---

## 5. Repository/Service Pattern

```typescript
// resources.repository.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Resource } from '@prisma/client';

@Injectable()
export class ResourcesRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(
    where: Prisma.ResourceWhereInput,
    options?: { skip?: number; take?: number },
  ): Promise<Resource[]> {
    return this.prisma.resource.findMany({
      where,
      skip: options?.skip,
      take: options?.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string): Promise<Resource | null> {
    return this.prisma.resource.findFirst({
      where: { id, userId, deletedAt: null },
    });
  }

  async create(data: Prisma.ResourceCreateInput): Promise<Resource> {
    return this.prisma.resource.create({ data });
  }

  async update(id: string, data: Prisma.ResourceUpdateInput): Promise<Resource> {
    return this.prisma.resource.update({ where: { id }, data });
  }

  async softDelete(id: string): Promise<Resource> {
    return this.prisma.resource.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}

// resources.service.ts
import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { ResourcesRepository } from './resources.repository';
import { CreateResourceDto, UpdateResourceDto } from './dto/resource.dto';
import { Resource } from '@prisma/client';

@Injectable()
export class ResourcesService {
  constructor(private readonly resourcesRepo: ResourcesRepository) {}

  async findAll(userId: string): Promise<Resource[]> {
    return this.resourcesRepo.findMany({ userId, deletedAt: null });
  }

  async findOne(id: string, userId: string): Promise<Resource> {
    const resource = await this.resourcesRepo.findOne(id, userId);
    if (!resource) throw new NotFoundException(`Resource ${id} not found`);
    if (resource.userId !== userId) throw new ForbiddenException('Access denied');
    return resource;
  }

  async create(dto: CreateResourceDto, userId: string): Promise<Resource> {
    return this.resourcesRepo.create({ ...dto, user: { connect: { id: userId } } });
  }

  async update(id: string, dto: UpdateResourceDto, userId: string): Promise<Resource> {
    await this.findOne(id, userId); // ownership check
    return this.resourcesRepo.update(id, dto);
  }

  async remove(id: string, userId: string): Promise<void> {
    await this.findOne(id, userId); // ownership check
    await this.resourcesRepo.softDelete(id);
  }
}
```

---

## 6. Paginated Query with Prisma

```typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Resource } from '@prisma/client';

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
    page: number = 1,
    limit: number = 20,
    search?: string,
  ): Promise<PaginatedResult<Resource>> {
    const where = {
      userId,
      deletedAt: null,
      ...(search && {
        title: { contains: search, mode: 'insensitive' as const },
      }),
    };

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
}
```

---

## 7. Prisma Migration Example

```bash
# Generate and apply a new migration
npx prisma migrate dev --name add_resources_table

# Apply migrations in production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

```sql
-- Migration file: prisma/migrations/20240101000000_add_resources_table/migration.sql

CREATE TABLE "resources" (
    "id"          UUID         NOT NULL DEFAULT gen_random_uuid(),
    "title"       VARCHAR(200) NOT NULL,
    "description" TEXT,
    "status"      VARCHAR(20)  NOT NULL DEFAULT 'active',
    "user_id"     UUID         NOT NULL,
    "created_at"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at"  TIMESTAMP(3) NOT NULL,
    "deleted_at"  TIMESTAMP(3),

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "resources_user_id_idx" ON "resources"("user_id");

ALTER TABLE "resources"
    ADD CONSTRAINT "resources_user_id_fkey"
    FOREIGN KEY ("user_id")
    REFERENCES "users"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
```

---

## 8. Vitest + Supertest Endpoint Test

```typescript
// resources.e2e-spec.ts
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Resources (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Create a test user and obtain JWT
    const loginRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: 'test@example.com', password: 'password123' });

    authToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await prisma.resource.deleteMany({ where: { title: { startsWith: 'Test' } } });
    await app.close();
  });

  it('POST /api/resources - creates a resource', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/resources')
      .set('Authorization', `Bearer ${authToken}`)
      .send({ title: 'Test Resource', description: 'Test description' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      id: expect.any(String),
      title: 'Test Resource',
      description: 'Test description',
      status: 'active',
    });
  });

  it('GET /api/resources - lists resources', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/resources')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('GET /api/resources/:id - returns 404 for unknown id', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/resources/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(404);
  });

  it('GET /api/resources - returns 401 without token', async () => {
    const res = await request(app.getHttpServer()).get('/api/resources');
    expect(res.status).toBe(401);
  });
});
```
