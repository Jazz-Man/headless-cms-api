# Headless CMS API — Phase 1 MVP Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the core headless CMS API with auth, content types, contents, taxonomies, terms, SEO, menus, and media — all wired together with TypeORM + PostgreSQL.

**Architecture:** NestJS 11 modular structure with global JWT auth guard, TypeORM entities with UUID PKs, hybrid schema (fixed columns + JSONB for custom fields), Zod for JSONB validation.

**Tech Stack:** NestJS 11, TypeORM, PostgreSQL, Passport JWT, bcrypt, Zod, class-validator, Multer, Bun runtime.

**Spec:** `docs/superpowers/specs/2026-05-12-headless-cms-api-design.md`

---

## File Structure Map

```
src/
  main.ts                              # MODIFY — add global pipes, CORS, cookie-parser, static serving
  app.module.ts                        # MODIFY — import all modules

  config/
    config.module.ts                   # CREATE — @nestjs/config with validation
    database.config.ts                 # CREATE — TypeORM async config

  types/
    express.d.ts                       # CREATE — Express Request type augmentation for req.user

  common/
    decorators/
      public.decorator.ts              # CREATE — @Public() decorator
      roles.decorator.ts               # CREATE — @Roles() decorator
    guards/
      jwt-auth.guard.ts                # CREATE — global JWT guard
      roles.guard.ts                   # CREATE — RBAC guard
    filters/
      http-exception.filter.ts         # CREATE — unified error responses
    interceptors/
      logging.interceptor.ts           # CREATE — request logging
    pipes/
      slug.pipe.ts                     # CREATE — slug generation

  entities/                            # CREATE — all TypeORM entities
    user.entity.ts
    content-type.entity.ts
    content.entity.ts
    seo-meta.entity.ts
    taxonomy.entity.ts
    term.entity.ts
    content-term.entity.ts
    menu.entity.ts
    menu-item.entity.ts
    media.entity.ts
    refresh-token.entity.ts

  auth/
    auth.module.ts                     # CREATE
    auth.controller.ts                 # CREATE
    auth.service.ts                    # CREATE
    dto/
      login.dto.ts                     # CREATE
    strategies/
      jwt.strategy.ts                  # CREATE

  content-types/
    content-types.module.ts            # CREATE
    content-types.controller.ts        # CREATE
    content-types.service.ts           # CREATE
    dto/
      create-content-type.dto.ts       # CREATE
      update-content-type.dto.ts       # CREATE

  taxonomies/
    taxonomies.module.ts               # CREATE
    taxonomies.controller.ts           # CREATE
    taxonomies.service.ts              # CREATE
    dto/
      create-taxonomy.dto.ts           # CREATE
      update-taxonomy.dto.ts           # CREATE
    terms/
      terms.module.ts                  # CREATE
      terms.controller.ts              # CREATE
      terms.service.ts                 # CREATE
      dto/
        create-term.dto.ts             # CREATE
        update-term.dto.ts             # CREATE

  seo/
    seo.module.ts                      # CREATE
    seo.service.ts                     # CREATE
    dto/
      upsert-seo.dto.ts                # CREATE

  contents/
    contents.module.ts                 # CREATE
    contents.controller.ts             # CREATE
    contents.service.ts                # CREATE
    dto/
      create-content.dto.ts            # CREATE
      update-content.dto.ts            # CREATE
      query-contents.dto.ts            # CREATE

  menus/
    menus.module.ts                    # CREATE
    menus.controller.ts                # CREATE
    menus.service.ts                   # CREATE
    menu-items/
      menu-items.controller.ts         # CREATE
      menu-items.service.ts            # CREATE
    dto/
      create-menu.dto.ts               # CREATE
      update-menu.dto.ts               # CREATE
      create-menu-item.dto.ts          # CREATE
      update-menu-item.dto.ts          # CREATE
      reorder-menu-items.dto.ts        # CREATE

  media/
    media.module.ts                    # CREATE
    media.controller.ts                # CREATE
    media.service.ts                   # CREATE
    storage/
      storage.interface.ts             # CREATE
      local.storage.ts                 # CREATE
    dto/
      upload-response.dto.ts           # CREATE
```

---

## Chunk 1: Foundation — Dependencies, Config, Entities

### Task 1: Install dependencies

**Files:**
- Modify: `package.json` (via bun add)
- Modify: `bun.lock` (auto-updated)

- [ ] **Step 1: Install production dependencies**

Run:
```bash
bun add @nestjs/config @nestjs/typeorm typeorm pg @nestjs/passport passport passport-jwt bcrypt zod class-validator class-transformer uuid cookie-parser
```

- [ ] **Step 2: Install dev dependencies**

Run:
```bash
bun add -d @types/passport-jwt @types/bcrypt @types/uuid @types/multer @types/cookie-parser
```

- [ ] **Step 3: Verify installation**

Run: `bun run build`
Expected: Compiles without errors.

- [ ] **Step 4: Commit**

```bash
git add package.json bun.lock
git commit -m "chore: add TypeORM, auth, validation, and storage dependencies"
```

---

### Task 2: Config module with env validation

**Files:**
- Create: `src/config/config.module.ts`
- Create: `src/config/database.config.ts`

- [ ] **Step 1: Write config module**

Create `src/config/config.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { ConfigModule as NestConfigModule } from '@nestjs/config'

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env'],
      validationOptions: { abortEarly: true },
    }),
  ],
})
export class ConfigModule {}
```

- [ ] **Step 2: Write database config**

Create `src/config/database.config.ts`:
```typescript
import { registerAs } from '@nestjs/config'
import { TypeOrmModuleOptions } from '@nestjs/typeorm'
import { DataSource, DataSourceOptions } from 'typeorm'

export const databaseConfig = registerAs(
  'database',
  (): TypeOrmModuleOptions => ({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'headless_cms',
    autoLoadEntities: true,
    synchronize: process.env.NODE_ENV !== 'production',
    logging: process.env.DB_LOGGING === 'true',
  }),
)

export const dataSourceOptions: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST ?? 'localhost',
  port: parseInt(process.env.DB_PORT ?? '5432', 10),
  username: process.env.DB_USERNAME ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_DATABASE ?? 'headless_cms',
  entities: ['dist/entities/*.entity.js'],
  migrations: ['dist/migrations/*.js'],
  synchronize: false,
}

export default new DataSource(dataSourceOptions)
```

- [ ] **Step 3: Create .env.example and .env**

Create `.env.example`:
```
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=headless_cms
JWT_SECRET=change-me-in-production
JWT_EXPIRES_IN=900
JWT_REFRESH_EXPIRES_IN=604800
STORAGE_DRIVER=local
UPLOAD_DIR=./uploads
PORT=3000
```

Copy to `.env` locally: `cp .env.example .env`

- [ ] **Step 4: Verify compilation**

Run: `bun run build`
Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add src/config/ .env.example
git commit -m "feat: add config module with TypeORM database config"
```

---

### Task 3: TypeORM entities

**Files:**
- Create: `src/entities/user.entity.ts`
- Create: `src/entities/content-type.entity.ts`
- Create: `src/entities/content.entity.ts`
- Create: `src/entities/seo-meta.entity.ts`
- Create: `src/entities/taxonomy.entity.ts`
- Create: `src/entities/term.entity.ts`
- Create: `src/entities/content-term.entity.ts`
- Create: `src/entities/menu.entity.ts`
- Create: `src/entities/menu-item.entity.ts`
- Create: `src/entities/media.entity.ts`
- Create: `src/entities/refresh-token.entity.ts`

- [ ] **Step 1: Write User entity**

Create `src/entities/user.entity.ts`:
```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer',
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  email: string

  @Column({ name: 'password_hash' })
  passwordHash: string

  @Column({ name: 'display_name', nullable: true })
  displayName: string

  @Column({ type: 'enum', enum: UserRole, default: UserRole.VIEWER })
  role: UserRole

  @Column({ name: 'is_active', default: true })
  isActive: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
```

- [ ] **Step 2: Write ContentType entity**

Create `src/entities/content-type.entity.ts`:
```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Content } from './content.entity'

@Entity('content_types')
export class ContentType {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  slug: string

  @Column()
  name: string

  @Column({ name: 'schema_jsonb', type: 'jsonb', default: '{}' })
  schemaJsonb: Record<string, unknown>

  @Column({ name: 'is_builtin', default: false })
  isBuiltin: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @OneToMany('Content', 'contentType')
  contents: Content[]
}
```

- [ ] **Step 3: Write Content entity**

Create `src/entities/content.entity.ts`:
```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { ContentType } from './content-type.entity'
import { User } from './user.entity'

export enum ContentStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

@Entity('contents')
@Index(['slug', 'typeId'], { unique: true })
@Index(['status', 'publishedAt'])
export class Content {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'type_id' })
  typeId: string

  @ManyToOne('ContentType', 'contents')
  @JoinColumn({ name: 'type_id' })
  contentType: ContentType

  @Column()
  title: string

  @Column({ unique: false })
  slug: string

  @Column({ type: 'text', nullable: true })
  excerpt: string

  @Column({ name: 'body_jsonb', type: 'jsonb', nullable: true })
  bodyJsonb: Record<string, unknown>

  @Column({ type: 'enum', enum: ContentStatus, default: ContentStatus.DRAFT })
  status: ContentStatus

  @Column({ name: 'author_id', nullable: true })
  authorId: string

  @ManyToOne('User')
  @JoinColumn({ name: 'author_id' })
  author: User

  @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
  publishedAt: Date

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
```

- [ ] **Step 4: Write SeoMeta entity**

Create `src/entities/seo-meta.entity.ts`:
```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm'

export enum SeoEntityType {
  CONTENT = 'content',
  TERM = 'term',
}

@Entity('seo_meta')
@Unique(['entityType', 'entityId'])
export class SeoMeta {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'entity_type', type: 'enum', enum: SeoEntityType })
  entityType: SeoEntityType

  @Column({ name: 'entity_id' })
  entityId: string

  @Column({ name: 'meta_title', length: '60', nullable: true })
  metaTitle: string

  @Column({ name: 'meta_description', length: '160', nullable: true })
  metaDescription: string

  @Column({ name: 'og_title', length: '100', nullable: true })
  ogTitle: string

  @Column({ name: 'og_description', length: '200', nullable: true })
  ogDescription: string

  @Column({ name: 'og_image', length: '500', nullable: true })
  ogImage: string

  @Column({ name: 'canonical_url', length: '500', nullable: true })
  canonicalUrl: string

  @Column({ name: 'robots_index', default: true })
  robotsIndex: boolean

  @Column({ name: 'robots_follow', default: true })
  robotsFollow: boolean

  @Column({ name: 'focus_keyword', length: '200', nullable: true })
  focusKeyword: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
```

- [ ] **Step 5: Write Taxonomy and Term entities**

Create `src/entities/taxonomy.entity.ts`:
```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Term } from './term.entity'

export enum TaxonomyType {
  HIERARCHICAL = 'hierarchical',
  FLAT = 'flat',
}

@Entity('taxonomies')
export class Taxonomy {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  slug: string

  @Column()
  name: string

  @Column({ type: 'enum', enum: TaxonomyType })
  type: TaxonomyType

  @Column({ name: 'is_builtin', default: false })
  isBuiltin: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @OneToMany('Term', 'taxonomy')
  terms: Term[]
}
```

Create `src/entities/term.entity.ts`:
```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Tree,
  TreeChildren,
  TreeParent,
} from 'typeorm'
import { Taxonomy } from './taxonomy.entity'

@Entity('terms')
@Tree('materialized-path')
@Index(['slug', 'taxonomyId'], { unique: true })
export class Term {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'taxonomy_id' })
  taxonomyId: string

  @ManyToOne('Taxonomy', 'terms')
  @JoinColumn({ name: 'taxonomy_id' })
  taxonomy: Taxonomy

  @Column()
  name: string

  @Column()
  slug: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ name: 'parent_id', nullable: true })
  parentId: string

  @ManyToOne('Term')
  @JoinColumn({ name: 'parent_id' })
  @TreeParent()
  parent: Term

  @OneToMany('Term', 'parent')
  @TreeChildren()
  children: Term[]

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
```

- [ ] **Step 6: Write ContentTerm join entity**

Create `src/entities/content-term.entity.ts`:
```typescript
import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm'
import { Content } from './content.entity'
import { Term } from './term.entity'

@Entity('content_terms')
export class ContentTerm {
  @PrimaryColumn({ name: 'content_id' })
  contentId: string

  @PrimaryColumn({ name: 'term_id' })
  termId: string

  @ManyToOne('Content', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'content_id' })
  content: Content

  @ManyToOne('Term', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'term_id' })
  term: Term
}
```

- [ ] **Step 7: Write Menu and MenuItem entities**

Create `src/entities/menu.entity.ts`:
```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { MenuItem } from './menu-item.entity'

@Entity('menus')
export class Menu {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ unique: true })
  slug: string

  @Column()
  name: string

  @Column({ nullable: true })
  location: string

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date

  @OneToMany('MenuItem', 'menu')
  items: MenuItem[]
}
```

Create `src/entities/menu-item.entity.ts`:
```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Menu } from './menu.entity'

export enum MenuItemType {
  CONTENT = 'content',
  TERM = 'term',
  CUSTOM = 'custom',
}

@Entity('menu_items')
@Index(['menuId', 'sortOrder'])
@Index(['parentId'])
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'menu_id' })
  menuId: string

  @ManyToOne('Menu', 'items', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'menu_id' })
  menu: Menu

  @Column({ name: 'parent_id', nullable: true })
  parentId: string

  @ManyToOne('MenuItem', { nullable: true, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'parent_id' })
  parent: MenuItem

  @Column({ type: 'enum', enum: MenuItemType })
  type: MenuItemType

  @Column({ name: 'target_id', nullable: true })
  targetId: string

  @Column({ nullable: true })
  url: string

  @Column()
  label: string

  @Column({ name: 'css_class', nullable: true })
  cssClass: string

  @Column({ name: 'target_attr', default: '_self' })
  targetAttr: string

  @Column({ name: 'sort_order', default: 0 })
  sortOrder: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date
}
```

- [ ] **Step 8: Write Media and RefreshToken entities**

Create `src/entities/media.entity.ts`:
```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'

@Entity('media')
export class Media {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  filename: string

  @Column({ name: 'original_name' })
  originalName: string

  @Column({ name: 'mime_type' })
  mimeType: string

  @Column({ name: 'size_bytes' })
  sizeBytes: number

  @Column()
  path: string

  @Column({ name: 'alt_text', nullable: true })
  altText: string

  @Column({ name: 'uploaded_by', nullable: true })
  uploadedBy: string

  @ManyToOne('User')
  @JoinColumn({ name: 'uploaded_by' })
  uploader: User

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
```

Create `src/entities/refresh-token.entity.ts`:
```typescript
import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { User } from './user.entity'

@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column({ name: 'user_id' })
  userId: string

  @ManyToOne('User')
  @JoinColumn({ name: 'user_id' })
  user: User

  @Column({ name: 'token_hash' })
  tokenHash: string

  @Column({ name: 'expires_at', type: 'timestamptz' })
  expiresAt: Date

  @Column({ name: 'is_revoked', default: false })
  isRevoked: boolean

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date
}
```

- [ ] **Step 9: Verify compilation**

Run: `bun run build`
Expected: Compiles without errors.

- [ ] **Step 10: Commit**

```bash
git add src/entities/
git commit -m "feat: add all TypeORM entities for CMS schema"
```

---

### Task 4: Common infrastructure — decorators, guards, filters

**Files:**
- Create: `src/common/decorators/public.decorator.ts`
- Create: `src/common/decorators/roles.decorator.ts`
- Create: `src/common/guards/jwt-auth.guard.ts`
- Create: `src/common/guards/roles.guard.ts`
- Create: `src/common/filters/http-exception.filter.ts`
- Create: `src/common/interceptors/logging.interceptor.ts`
- Create: `src/common/pipes/slug.pipe.ts`
- Create: `src/types/express.d.ts`

- [ ] **Step 1: Write @Public() decorator**

Create `src/common/decorators/public.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common'

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)
```

- [ ] **Step 2: Write @Roles() decorator**

Create `src/common/decorators/roles.decorator.ts`:
```typescript
import { SetMetadata } from '@nestjs/common'
import { UserRole } from '../../entities/user.entity'

export const ROLES_KEY = 'roles'
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles)
```

- [ ] **Step 3: Write JwtAuthGuard**

Create `src/common/guards/jwt-auth.guard.ts`:
```typescript
import { Injectable, ExecutionContext } from '@nestjs/common'
import { AuthGuard } from '@nestjs/passport'
import { Reflector } from '@nestjs/core'
import { IS_PUBLIC_KEY } from '../decorators/public.decorator'

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super()
  }

  canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      IS_PUBLIC_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (isPublic) return true
    return super.canActivate(context)
  }
}
```

- [ ] **Step 4: Write RolesGuard**

Create `src/common/guards/roles.guard.ts`:
```typescript
import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import { ROLES_KEY } from '../decorators/roles.decorator'
import { UserRole } from '../../entities/user.entity'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<UserRole[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    )
    if (!requiredRoles || requiredRoles.length === 0) return true

    const { user } = context.switchToHttp().getRequest()
    if (!user) throw new ForbiddenException()

    return requiredRoles.includes(user.role)
  }
}
```

- [ ] **Step 5: Write HttpExceptionFilter**

Create `src/common/filters/http-exception.filter.ts`:
```typescript
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common'
import { Response } from 'express'

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp()
    const response = ctx.getResponse<Response>()

    let status = HttpStatus.INTERNAL_SERVER_ERROR
    let message = 'Internal server error'
    let errors: unknown[] | undefined

    if (exception instanceof HttpException) {
      status = exception.getStatus()
      const exResponse = exception.getResponse()
      if (typeof exResponse === 'string') {
        message = exResponse
      } else if (typeof exResponse === 'object') {
        const obj = exResponse as Record<string, unknown>
        message = (obj.message as string) ?? exception.message
        if (Array.isArray(obj.message)) {
          errors = obj.message
          message = 'Validation failed'
        }
      }
    }

    response.status(status).json({ statusCode: status, message, errors })
  }
}
```

- [ ] **Step 6: Write LoggingInterceptor**

Create `src/common/interceptors/logging.interceptor.ts`:
```typescript
import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common'
import { Observable } from 'rxjs'
import { tap } from 'rxjs/operators'

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP')

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest()
    const { method, url } = request
    const now = Date.now()

    return next.handle().pipe(
      tap(() => {
        this.logger.log(`${method} ${url} - ${Date.now() - now}ms`)
      }),
    )
  }
}
```

- [ ] **Step 7: Write slug pipe**

Create `src/common/pipes/slug.pipe.ts`:
```typescript
import { PipeTransform, Injectable } from '@nestjs/common'

@Injectable()
export class SlugPipe implements PipeTransform<string, string> {
  transform(value: string): string {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
```

- [ ] **Step 8: Write Express type augmentation for req.user**

Create `src/types/express.d.ts`:
```typescript
declare module 'express-serve-static-core' {
  interface Request {
    user?: {
      id: string
      email: string
      role: string
    }
  }
}
```

- [ ] **Step 8: Verify compilation**

Run: `bun run build`
Expected: Compiles without errors.

- [ ] **Step 9: Commit**

```bash
git add src/common/
git commit -m "feat: add common decorators, guards, filter, interceptor, slug pipe"
```

---

### Task 5: Update AppModule and main.ts

**Files:**
- Modify: `src/app.module.ts`
- Modify: `src/main.ts`
- Delete: `src/app.controller.ts`
- Delete: `src/app.service.ts`
- Delete: `src/app.controller.spec.ts`

- [ ] **Step 1: Update AppModule**

Replace `src/app.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { APP_GUARD } from '@nestjs/core'
import { databaseConfig } from './config/database.config'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
```

- [ ] **Step 2: Update main.ts**

Replace `src/main.ts`:
```typescript
import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import * as cookieParser from 'cookie-parser'
import * as express from 'express'
import * as path from 'path'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'
import { LoggingInterceptor } from './common/interceptors/logging.interceptor'

async function bootstrap() {
  const logger = new Logger('Bootstrap')
  const app = await NestFactory.create(AppModule)

  app.setGlobalPrefix('api')

  app.use(cookieParser())
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())
  app.useGlobalInterceptors(new LoggingInterceptor())

  const port = process.env.PORT ?? 3000
  await app.listen(port)
  logger.log(`Application running on port ${port}`)
}
bootstrap()
```

Note: All routes will be prefixed with `/api/` — e.g., `POST /api/auth/login`.

- [ ] **Step 3: Remove default starter files**

```bash
rm src/app.controller.ts src/app.service.ts src/app.controller.spec.ts
```

- [ ] **Step 4: Verify compilation**

Run: `bun run build`
Expected: Compiles without errors.

- [ ] **Step 5: Commit**

```bash
git add src/ && git commit -m "feat: wire AppModule with TypeORM, global guards, pipes, filters"
```

---

## Chunk 2: Auth Module

### Task 6: Auth module — DTOs, service, controller, strategy

**Files:**
- Create: `src/auth/dto/login.dto.ts`
- Create: `src/auth/strategies/jwt.strategy.ts`
- Create: `src/auth/auth.service.ts`
- Create: `src/auth/auth.controller.ts`
- Create: `src/auth/auth.module.ts`

- [ ] **Step 1: Write LoginDto**

Create `src/auth/dto/login.dto.ts`:
```typescript
import { IsEmail, IsString, MinLength } from 'class-validator'

export class LoginDto {
  @IsEmail()
  email: string

  @IsString()
  @MinLength(6)
  password: string
}
```

- [ ] **Step 2: Write JWT strategy**

Create `src/auth/strategies/jwt.strategy.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

interface JwtPayload {
  sub: string
  email: string
  role: string
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.get<string>('JWT_SECRET', 'change-me'),
    })
  }

  validate(payload: JwtPayload) {
    return { id: payload.sub, email: payload.email, role: payload.role }
  }
}
```

- [ ] **Step 3: Write AuthService**

Create `src/auth/auth.service.ts`:
```typescript
import {
  Injectable,
  UnauthorizedException,
  ConflictException,
} from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { v4 as uuid } from 'uuid'
import { User } from '../entities/user.entity'
import { RefreshToken } from '../entities/refresh-token.entity'
import { LoginDto } from './dto/login.dto'

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepo: Repository<RefreshToken>,
    private jwt: JwtService,
    private config: ConfigService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({ where: { email: dto.email } })
    if (!user || !user.isActive) throw new UnauthorizedException()

    const valid = await bcrypt.compare(dto.password, user.passwordHash)
    if (!valid) throw new UnauthorizedException()

    return this.generateTokens(user)
  }

  async refresh(token: string) {
    const hash = await this.hashToken(token)
    const stored = await this.refreshTokenRepo.findOne({
      where: { tokenHash: hash },
    })

    if (!stored || stored.isRevoked || stored.expiresAt < new Date()) {
      throw new UnauthorizedException()
    }

    stored.isRevoked = true
    await this.refreshTokenRepo.save(stored)

    const user = await this.userRepo.findOne({ where: { id: stored.userId } })
    if (!user || !user.isActive) throw new UnauthorizedException()

    return this.generateTokens(user)
  }

  async logout(userId: string, token?: string) {
    if (!token) return
    const hash = await this.hashToken(token)
    await this.refreshTokenRepo.update(
      { tokenHash: hash, userId },
      { isRevoked: true },
    )
  }

  async me(userId: string) {
    const user = await this.userRepo.findOne({ where: { id: userId } })
    if (!user) throw new UnauthorizedException()
    return { id: user.id, email: user.email, role: user.role, displayName: user.displayName }
  }

  private async generateTokens(user: User) {
    const payload = { sub: user.id, email: user.email, role: user.role }
    const accessToken = this.jwt.sign(payload)

    const rawRefresh = uuid()
    const hash = await this.hashToken(rawRefresh)
    const expiresIn = this.config.get<number>('JWT_REFRESH_EXPIRES_IN', 604800)

    await this.refreshTokenRepo.save(
      this.refreshTokenRepo.create({
        userId: user.id,
        tokenHash: hash,
        expiresAt: new Date(Date.now() + expiresIn * 1000),
      }),
    )

    return {
      accessToken,
      refreshToken: rawRefresh,
      user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName },
    }
  }

  private async hashToken(token: string): Promise<string> {
    return bcrypt.hash(token, 10)
  }
}
```

Note: AuthModule needs `@nestjs/jwt` — install it in Step 5.

- [ ] **Step 4: Write AuthController**

Create `src/auth/auth.controller.ts`:
```typescript
import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common'
import { Request, Response } from 'express'
import { AuthService } from './auth.service'
import { LoginDto } from './dto/login.dto'
import { Public } from '../common/decorators/public.decorator'

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto)
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    })
    return { accessToken: result.accessToken, user: result.user }
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token as string
    const result = await this.authService.refresh(token)
    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/api/auth',
    })
    return { accessToken: result.accessToken, user: result.user }
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = req.cookies?.refresh_token as string
    await this.authService.logout(req.user.id, token)
    res.clearCookie('refresh_token', { path: '/api/auth' })
  }

  @Get('me')
  async me(@Req() req: Request) {
    return this.authService.me(req.user.id)
  }
}
```

- [ ] **Step 5: Install @nestjs/jwt and create AuthModule**

Run: `bun add @nestjs/jwt`

Create `src/auth/auth.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { PassportModule } from '@nestjs/passport'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { JwtStrategy } from './strategies/jwt.strategy'
import { User } from '../entities/user.entity'
import { RefreshToken } from '../entities/refresh-token.entity'

@Module({
  imports: [
    TypeOrmModule.forFeature([User, RefreshToken]),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (config: ConfigService) => ({
        secret: config.get<string>('JWT_SECRET', 'change-me'),
        signOptions: {
          expiresIn: config.get<number>('JWT_EXPIRES_IN', 900) + 's',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy],
  exports: [AuthService],
})
export class AuthModule {}
```

- [ ] **Step 6: Register AuthModule in AppModule**

Add `AuthModule` to `src/app.module.ts` imports array.

- [ ] **Step 7: Verify compilation**

Run: `bun run build`
Expected: Compiles without errors.

- [ ] **Step 8: Commit**

```bash
git add src/auth/ src/app.module.ts package.json bun.lock
git commit -m "feat: add auth module with JWT login, refresh, logout"
```

---

## Chunk 3: Content Types, Taxonomies, Terms

### Task 7: Content Types module

**Files:**
- Create: `src/content-types/dto/create-content-type.dto.ts`
- Create: `src/content-types/dto/update-content-type.dto.ts`
- Create: `src/content-types/content-types.service.ts`
- Create: `src/content-types/content-types.controller.ts`
- Create: `src/content-types/content-types.module.ts`

- [ ] **Step 1: Write DTOs**

Create `src/content-types/dto/create-content-type.dto.ts`:
```typescript
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateContentTypeDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  slug: string

  @IsOptional()
  schemaJsonb?: Record<string, unknown>
}
```

Create `src/content-types/dto/update-content-type.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator'

export class UpdateContentTypeDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  schemaJsonb?: Record<string, unknown>
}
```

- [ ] **Step 2: Write ContentTypesService**

Create `src/content-types/content-types.service.ts`:
```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContentType } from '../entities/content-type.entity'
import { CreateContentTypeDto } from './dto/create-content-type.dto'
import { UpdateContentTypeDto } from './dto/update-content-type.dto'

@Injectable()
export class ContentTypesService {
  constructor(
    @InjectRepository(ContentType)
    private repo: Repository<ContentType>,
  ) {}

  async create(dto: CreateContentTypeDto) {
    const exists = await this.repo.findOne({ where: { slug: dto.slug } })
    if (exists) throw new ConflictException(`Content type "${dto.slug}" already exists`)

    const ct = this.repo.create(dto)
    return this.repo.save(ct)
  }

  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } })
  }

  async findOne(slug: string) {
    const ct = await this.repo.findOne({ where: { slug } })
    if (!ct) throw new NotFoundException(`Content type "${slug}" not found`)
    return ct
  }

  async update(slug: string, dto: UpdateContentTypeDto) {
    const ct = await this.findOne(slug)
    Object.assign(ct, dto)
    return this.repo.save(ct)
  }

  async remove(slug: string) {
    const ct = await this.findOne(slug)
    await this.repo.remove(ct)
  }
}
```

- [ ] **Step 3: Write ContentTypesController**

Create `src/content-types/content-types.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { ContentTypesService } from './content-types.service'
import { CreateContentTypeDto } from './dto/create-content-type.dto'
import { UpdateContentTypeDto } from './dto/update-content-type.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../entities/user.entity'
import { Public } from '../common/decorators/public.decorator'

@Controller('content-types')
export class ContentTypesController {
  constructor(private service: ContentTypesService) {}

  @Roles(UserRole.ADMIN)
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Roles(UserRole.ADMIN)
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.service.findOne(slug)
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateContentTypeDto) {
    return this.service.create(dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateContentTypeDto) {
    return this.service.update(slug, dto)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.service.remove(slug)
  }
}
```

- [ ] **Step 4: Write ContentTypesModule**

Create `src/content-types/content-types.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ContentType } from '../entities/content-type.entity'
import { ContentTypesService } from './content-types.service'
import { ContentTypesController } from './content-types.controller'

@Module({
  imports: [TypeOrmModule.forFeature([ContentType])],
  controllers: [ContentTypesController],
  providers: [ContentTypesService],
  exports: [ContentTypesService],
})
export class ContentTypesModule {}
```

- [ ] **Step 5: Register in AppModule and verify**

Add `ContentTypesModule` to `src/app.module.ts` imports. Run: `bun run build`

- [ ] **Step 6: Commit**

```bash
git add src/content-types/ src/app.module.ts
git commit -m "feat: add content types module (CRUD)"
```

---

### Task 8: Taxonomies module

**Files:**
- Create: `src/taxonomies/dto/create-taxonomy.dto.ts`
- Create: `src/taxonomies/dto/update-taxonomy.dto.ts`
- Create: `src/taxonomies/taxonomies.service.ts`
- Create: `src/taxonomies/taxonomies.controller.ts`
- Create: `src/taxonomies/taxonomies.module.ts`

- [ ] **Step 1: Write DTOs**

Create `src/taxonomies/dto/create-taxonomy.dto.ts`:
```typescript
import { IsEnum, IsNotEmpty, IsString } from 'class-validator'
import { TaxonomyType } from '../../entities/taxonomy.entity'

export class CreateTaxonomyDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  slug: string

  @IsEnum(TaxonomyType)
  type: TaxonomyType
}
```

Create `src/taxonomies/dto/update-taxonomy.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator'

export class UpdateTaxonomyDto {
  @IsOptional()
  @IsString()
  name?: string
}
```

- [ ] **Step 2: Write TaxonomiesService**

Create `src/taxonomies/taxonomies.service.ts`:
```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Taxonomy } from '../entities/taxonomy.entity'
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto'
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto'

@Injectable()
export class TaxonomiesService {
  constructor(
    @InjectRepository(Taxonomy)
    private repo: Repository<Taxonomy>,
  ) {}

  async create(dto: CreateTaxonomyDto) {
    const exists = await this.repo.findOne({ where: { slug: dto.slug } })
    if (exists) throw new ConflictException(`Taxonomy "${dto.slug}" already exists`)

    return this.repo.save(this.repo.create(dto))
  }

  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } })
  }

  async findOne(slug: string) {
    const tax = await this.repo.findOne({ where: { slug } })
    if (!tax) throw new NotFoundException(`Taxonomy "${slug}" not found`)
    return tax
  }

  async update(slug: string, dto: UpdateTaxonomyDto) {
    const tax = await this.findOne(slug)
    Object.assign(tax, dto)
    return this.repo.save(tax)
  }

  async remove(slug: string) {
    const tax = await this.findOne(slug)
    await this.repo.remove(tax)
  }
}
```

- [ ] **Step 3: Write TaxonomiesController**

Create `src/taxonomies/taxonomies.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { TaxonomiesService } from './taxonomies.service'
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto'
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../entities/user.entity'
import { Public } from '../common/decorators/public.decorator'

@Controller('taxonomies')
export class TaxonomiesController {
  constructor(private service: TaxonomiesService) {}

  @Public()
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateTaxonomyDto) {
    return this.service.create(dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateTaxonomyDto) {
    return this.service.update(slug, dto)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.service.remove(slug)
  }
}
```

- [ ] **Step 4: Write TaxonomiesModule**

Create `src/taxonomies/taxonomies.module.ts`:
```typescript
import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Taxonomy } from '../entities/taxonomy.entity'
import { TaxonomiesService } from './taxonomies.service'
import { TaxonomiesController } from './taxonomies.controller'
import { TermsModule } from './terms/terms.module'

@Module({
  imports: [TypeOrmModule.forFeature([Taxonomy]), forwardRef(() => TermsModule)],
  controllers: [TaxonomiesController],
  providers: [TaxonomiesService],
  exports: [TaxonomiesService],
})
export class TaxonomiesModule {}
```

- [ ] **Step 5: Commit**

```bash
git add src/taxonomies/
git commit -m "feat: add taxonomies module (CRUD)"
```

---

### Task 9: Terms sub-module

**Files:**
- Create: `src/taxonomies/terms/dto/create-term.dto.ts`
- Create: `src/taxonomies/terms/dto/update-term.dto.ts`
- Create: `src/taxonomies/terms/terms.service.ts`
- Create: `src/taxonomies/terms/terms.controller.ts`
- Create: `src/taxonomies/terms/terms.module.ts`

- [ ] **Step 1: Write DTOs**

Create `src/taxonomies/terms/dto/create-term.dto.ts`:
```typescript
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateTermDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  slug: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  parentId?: string
}
```

Create `src/taxonomies/terms/dto/update-term.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator'

export class UpdateTermDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  parentId?: string
}
```

- [ ] **Step 2: Write TermsService**

Create `src/taxonomies/terms/terms.service.ts`:
```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, TreeRepository } from 'typeorm'
import { Term } from '../../entities/term.entity'
import { Taxonomy } from '../../entities/taxonomy.entity'
import { CreateTermDto } from './dto/create-term.dto'
import { UpdateTermDto } from './dto/update-term.dto'

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(Term)
    private repo: Repository<Term>,
  ) {}

  async create(taxonomyId: string, dto: CreateTermDto) {
    const exists = await this.repo.findOne({
      where: { slug: dto.slug, taxonomyId },
    })
    if (exists)
      throw new ConflictException(`Term "${dto.slug}" already exists in this taxonomy`)

    return this.repo.save(this.repo.create({ ...dto, taxonomyId }))
  }

  async findFlat(taxonomyId: string) {
    return this.repo.find({
      where: { taxonomyId },
      order: { sortOrder: 'ASC', name: 'ASC' },
    })
  }

  async findTree(taxonomyId: string) {
    const parentRepo = this.repo.manager.getTreeRepository(Term)
    const roots = await parentRepo.findRoots()
    const taxonomyRoots = roots.filter((r) => r.taxonomyId === taxonomyId)
    return parentRepo.findDescendantsTree(
      taxonomyRoots.length > 0 ? taxonomyRoots[0] : (await this.repo.findOne({
        where: { taxonomyId, parentId: null },
      })) ?? taxonomyRoots[0],
    )
  }

  async findOne(taxonomyId: string, slug: string) {
    const term = await this.repo.findOne({
      where: { slug, taxonomyId },
    })
    if (!term) throw new NotFoundException(`Term "${slug}" not found`)
    return term
  }

  async update(taxonomyId: string, slug: string, dto: UpdateTermDto) {
    const term = await this.findOne(taxonomyId, slug)
    Object.assign(term, dto)
    return this.repo.save(term)
  }

  async remove(taxonomyId: string, slug: string) {
    const term = await this.findOne(taxonomyId, slug)
    await this.repo.remove(term)
  }
}
```

- [ ] **Step 3: Write TermsController**

Create `src/taxonomies/terms/terms.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { TermsService } from './terms.service'
import { CreateTermDto } from './dto/create-term.dto'
import { UpdateTermDto } from './dto/update-term.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../../entities/user.entity'
import { Public } from '../../common/decorators/public.decorator'

@Controller('taxonomies/:taxonomySlug/terms')
export class TermsController {
  constructor(private service: TermsService) {}

  @Public()
  @Get()
  async findAll(@Param('taxonomySlug') taxonomySlug: string) {
    const taxonomy = await this.findTaxonomyId(taxonomySlug)
    return this.service.findFlat(taxonomy.id)
  }

  @Public()
  @Get(':slug')
  async findOne(
    @Param('taxonomySlug') taxonomySlug: string,
    @Param('slug') slug: string,
  ) {
    const taxonomy = await this.findTaxonomyId(taxonomySlug)
    return this.service.findOne(taxonomy.id, slug)
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async create(
    @Param('taxonomySlug') taxonomySlug: string,
    @Body() dto: CreateTermDto,
  ) {
    const taxonomy = await this.findTaxonomyId(taxonomySlug)
    return this.service.create(taxonomy.id, dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch(':slug')
  async update(
    @Param('taxonomySlug') taxonomySlug: string,
    @Param('slug') slug: string,
    @Body() dto: UpdateTermDto,
  ) {
    const taxonomy = await this.findTaxonomyId(taxonomySlug)
    return this.service.update(taxonomy.id, slug, dto)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':slug')
  async remove(
    @Param('taxonomySlug') taxonomySlug: string,
    @Param('slug') slug: string,
  ) {
    const taxonomy = await this.findTaxonomyId(taxonomySlug)
    return this.service.remove(taxonomy.id, slug)
  }

  private taxonomyRepo: unknown

  private async findTaxonomyId(slug: string) {
    const { Taxonomy } = await import('../../entities/taxonomy.entity')
    const { InjectRepository } = await import('@nestjs/typeorm')
    // Use injected repo from service — see TermsModule for provider
    const taxService = await import('../taxonomies.service')
    return { id: slug } // resolved via service injection below
  }
}
```

IMPORTANT: The `findTaxonomyId` method above is a placeholder. The controller should inject `TaxonomiesService` to resolve the taxonomy slug to an ID. Correct implementation:

Replace the controller with:
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { TermsService } from './terms.service'
import { TaxonomiesService } from '../taxonomies.service'
import { CreateTermDto } from './dto/create-term.dto'
import { UpdateTermDto } from './dto/update-term.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../../entities/user.entity'
import { Public } from '../../common/decorators/public.decorator'

@Controller('taxonomies/:taxonomySlug/terms')
export class TermsController {
  constructor(
    private service: TermsService,
    private taxonomiesService: TaxonomiesService,
  ) {}

  @Public()
  @Get()
  async findAll(@Param('taxonomySlug') taxonomySlug: string) {
    const taxonomy = await this.taxonomiesService.findOne(taxonomySlug)
    return this.service.findFlat(taxonomy.id)
  }

  @Public()
  @Get(':slug')
  async findOne(
    @Param('taxonomySlug') taxonomySlug: string,
    @Param('slug') slug: string,
  ) {
    const taxonomy = await this.taxonomiesService.findOne(taxonomySlug)
    return this.service.findOne(taxonomy.id, slug)
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async create(
    @Param('taxonomySlug') taxonomySlug: string,
    @Body() dto: CreateTermDto,
  ) {
    const taxonomy = await this.taxonomiesService.findOne(taxonomySlug)
    return this.service.create(taxonomy.id, dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch(':slug')
  async update(
    @Param('taxonomySlug') taxonomySlug: string,
    @Param('slug') slug: string,
    @Body() dto: UpdateTermDto,
  ) {
    const taxonomy = await this.taxonomiesService.findOne(taxonomySlug)
    return this.service.update(taxonomy.id, slug, dto)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':slug')
  async remove(
    @Param('taxonomySlug') taxonomySlug: string,
    @Param('slug') slug: string,
  ) {
    const taxonomy = await this.taxonomiesService.findOne(taxonomySlug)
    return this.service.remove(taxonomy.id, slug)
  }
}
```

- [ ] **Step 4: Write TermsModule**

Create `src/taxonomies/terms/terms.module.ts`:
```typescript
import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Term } from '../../entities/term.entity'
import { TermsService } from './terms.service'
import { TermsController } from './terms.controller'
import { TaxonomiesModule } from '../taxonomies.module'

@Module({
  imports: [TypeOrmModule.forFeature([Term]), forwardRef(() => TaxonomiesModule)],
  controllers: [TermsController],
  providers: [TermsService],
  exports: [TermsService],
})
export class TermsModule {}
```

- [ ] **Step 5: Verify and commit**

Run: `bun run build`. Register `TaxonomiesModule` in `src/app.module.ts` if not done.

```bash
git add src/taxonomies/terms/ src/app.module.ts
git commit -m "feat: add terms sub-module with taxonomy slug resolution"
```

---

## Chunk 4: SEO + Contents

### Task 10: SEO module

**Files:**
- Create: `src/seo/dto/upsert-seo.dto.ts`
- Create: `src/seo/seo.service.ts`
- Create: `src/seo/seo.module.ts`

- [ ] **Step 1: Write UpsertSeoDto**

Create `src/seo/dto/upsert-seo.dto.ts`:
```typescript
import { IsBoolean, IsOptional, IsString } from 'class-validator'

export class UpsertSeoDto {
  @IsOptional()
  @IsString()
  metaTitle?: string

  @IsOptional()
  @IsString()
  metaDescription?: string

  @IsOptional()
  @IsString()
  ogTitle?: string

  @IsOptional()
  @IsString()
  ogDescription?: string

  @IsOptional()
  @IsString()
  ogImage?: string

  @IsOptional()
  @IsString()
  canonicalUrl?: string

  @IsOptional()
  @IsBoolean()
  robotsIndex?: boolean

  @IsOptional()
  @IsBoolean()
  robotsFollow?: boolean

  @IsOptional()
  @IsString()
  focusKeyword?: string
}
```

- [ ] **Step 2: Write SeoService**

Create `src/seo/seo.service.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { SeoMeta, SeoEntityType } from '../entities/seo-meta.entity'
import { UpsertSeoDto } from './dto/upsert-seo.dto'

@Injectable()
export class SeoService {
  constructor(
    @InjectRepository(SeoMeta)
    private repo: Repository<SeoMeta>,
  ) {}

  async upsert(
    entityType: SeoEntityType,
    entityId: string,
    dto: UpsertSeoDto,
  ) {
    if (!dto || Object.keys(dto).length === 0) return null

    let meta = await this.repo.findOne({ where: { entityType, entityId } })
    if (!meta) {
      meta = this.repo.create({ entityType, entityId })
    }
    Object.assign(meta, dto)
    return this.repo.save(meta)
  }

  async find(entityType: SeoEntityType, entityId: string) {
    return this.repo.findOne({ where: { entityType, entityId } })
  }

  async remove(entityType: SeoEntityType, entityId: string) {
    await this.repo.delete({ entityType, entityId })
  }
}
```

- [ ] **Step 3: Write SeoModule**

Create `src/seo/seo.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SeoMeta } from '../entities/seo-meta.entity'
import { SeoService } from './seo.service'

@Module({
  imports: [TypeOrmModule.forFeature([SeoMeta])],
  providers: [SeoService],
  exports: [SeoService],
})
export class SeoModule {}
```

- [ ] **Step 4: Commit**

```bash
git add src/seo/
git commit -m "feat: add SEO module with upsert/find/remove for polymorphic entities"
```

---

### Task 11: Contents module

**Files:**
- Create: `src/contents/dto/create-content.dto.ts`
- Create: `src/contents/dto/update-content.dto.ts`
- Create: `src/contents/dto/query-contents.dto.ts`
- Create: `src/contents/contents.service.ts`
- Create: `src/contents/contents.controller.ts`
- Create: `src/contents/contents.module.ts`

- [ ] **Step 1: Write DTOs**

Create `src/contents/dto/create-content.dto.ts`:
```typescript
import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { UpsertSeoDto } from '../../seo/dto/upsert-seo.dto'

export class CreateContentDto {
  @IsString()
  @IsNotEmpty()
  title: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsString()
  @IsNotEmpty()
  typeSlug: string

  @IsOptional()
  @IsString()
  excerpt?: string

  @IsOptional()
  bodyJsonb?: Record<string, unknown>

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  termIds?: string[]

  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertSeoDto)
  seo?: UpsertSeoDto
}
```

Create `src/contents/dto/update-content.dto.ts`:
```typescript
import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ContentStatus } from '../../entities/content.entity'
import { UpsertSeoDto } from '../../seo/dto/upsert-seo.dto'

export class UpdateContentDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  excerpt?: string

  @IsOptional()
  bodyJsonb?: Record<string, unknown>

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  termIds?: string[]

  @IsOptional()
  @ValidateNested()
  @Type(() => UpsertSeoDto)
  seo?: UpsertSeoDto
}
```

Create `src/contents/dto/query-contents.dto.ts`:
```typescript
import { IsEnum, IsInt, IsOptional, IsString, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { ContentStatus } from '../../entities/content.entity'

export class QueryContentsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 20

  @IsOptional()
  @IsString()
  type?: string

  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus

  @IsOptional()
  @IsString()
  taxonomy?: string

  @IsOptional()
  @IsString()
  search?: string

  @IsOptional()
  @IsString()
  sort?: string = '-publishedAt'
}
```

- [ ] **Step 2: Write ContentsService**

Create `src/contents/contents.service.ts`:
```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, In } from 'typeorm'
import { Content, ContentStatus } from '../entities/content.entity'
import { ContentType } from '../entities/content-type.entity'
import { ContentTerm } from '../entities/content-term.entity'
import { Term } from '../entities/term.entity'
import { SeoMeta, SeoEntityType } from '../entities/seo-meta.entity'
import { SeoService } from '../seo/seo.service'
import { ContentTypesService } from '../content-types/content-types.service'
import { CreateContentDto } from './dto/create-content.dto'
import { UpdateContentDto } from './dto/update-content.dto'
import { QueryContentsDto } from './dto/query-contents.dto'

@Injectable()
export class ContentsService {
  constructor(
    @InjectRepository(Content)
    private repo: Repository<Content>,
    @InjectRepository(ContentTerm)
    private contentTermRepo: Repository<ContentTerm>,
    private seoService: SeoService,
    private contentTypesService: ContentTypesService,
  ) {}

  async create(authorId: string, dto: CreateContentDto) {
    const contentType = await this.contentTypesService.findOne(dto.typeSlug)

    const content = this.repo.create({
      title: dto.title,
      slug: dto.slug ?? this.slugify(dto.title),
      typeId: contentType.id,
      excerpt: dto.excerpt,
      bodyJsonb: dto.bodyJsonb,
      status: ContentStatus.DRAFT,
      authorId,
    })

    const saved = await this.repo.save(content)

    if (dto.termIds?.length) {
      await this.syncTerms(saved.id, dto.termIds)
    }

    if (dto.seo) {
      await this.seoService.upsert(SeoEntityType.CONTENT, saved.id, dto.seo)
    }

    return this.findOneById(saved.id)
  }

  async findPublished(query: QueryContentsDto) {
    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.contentType', 'ct')
      .where('c.status = :status', { status: ContentStatus.PUBLISHED })

    if (query.type) {
      qb.andWhere('ct.slug = :type', { type: query.type })
    }

    if (query.search) {
      qb.andWhere('c.title ILIKE :search', { search: `%${query.search}%` })
    }

    if (query.sort) {
      const dir = query.sort.startsWith('-') ? 'DESC' : 'ASC'
      const field = query.sort.replace(/^-/, '')
      qb.orderBy(`c.${field}`, dir)
    } else {
      qb.orderBy('c.publishedAt', 'DESC')
    }

    const page = query.page ?? 1
    const limit = query.limit ?? 20
    qb.skip((page - 1) * limit).take(limit)

    const [items, total] = await qb.getManyAndCount()
    return { items, total, page, limit }
  }

  async findOneBySlug(slug: string) {
    const content = await this.repo.findOne({
      where: { slug },
      relations: ['contentType', 'author'],
    })
    if (!content) throw new NotFoundException(`Content "${slug}" not found`)

    const [seo, terms] = await Promise.all([
      this.seoService.find(SeoEntityType.CONTENT, content.id),
      this.getTerms(content.id),
    ])

    return { ...content, seo, terms }
  }

  async update(id: string, dto: UpdateContentDto, userId: string, userRole: string) {
    const content = await this.repo.findOne({ where: { id } })
    if (!content) throw new NotFoundException()

    Object.assign(content, {
      ...dto,
      ...(dto.status === ContentStatus.PUBLISHED && !content.publishedAt
        ? { publishedAt: new Date() }
        : {}),
    })

    const saved = await this.repo.save(content)

    if (dto.termIds) {
      await this.syncTerms(saved.id, dto.termIds)
    }

    if (dto.seo) {
      await this.seoService.upsert(SeoEntityType.CONTENT, saved.id, dto.seo)
    }

    return this.findOneById(saved.id)
  }

  async archive(id: string) {
    const content = await this.repo.findOne({ where: { id } })
    if (!content) throw new NotFoundException()
    content.status = ContentStatus.ARCHIVED
    return this.repo.save(content)
  }

  private async findOneById(id: string) {
    const content = await this.repo.findOne({
      where: { id },
      relations: ['contentType', 'author'],
    })
    const [seo, terms] = await Promise.all([
      this.seoService.find(SeoEntityType.CONTENT, id),
      this.getTerms(id),
    ])
    return { ...content, seo, terms }
  }

  private async syncTerms(contentId: string, termIds: string[]) {
    await this.contentTermRepo.delete({ contentId })
    if (termIds.length === 0) return
    const rows = termIds.map((termId) => ({ contentId, termId }))
    await this.contentTermRepo.save(rows)
  }

  private async getTerms(contentId: string) {
    const cts = await this.contentTermRepo.find({ where: { contentId } })
    if (cts.length === 0) return []
    return this.repo.manager.find(Term, {
      where: { id: In(cts.map((ct) => ct.termId)) },
    })
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/[\s_]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
```

- [ ] **Step 3: Write ContentsController**

Create `src/contents/contents.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Req,
} from '@nestjs/common'
import { Request } from 'express'
import { ContentsService } from './contents.service'
import { CreateContentDto } from './dto/create-content.dto'
import { UpdateContentDto } from './dto/update-content.dto'
import { QueryContentsDto } from './dto/query-contents.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { Public } from '../common/decorators/public.decorator'
import { UserRole } from '../entities/user.entity'

@Controller('contents')
export class ContentsController {
  constructor(private service: ContentsService) {}

  @Public()
  @Get()
  findAll(@Query() query: QueryContentsDto) {
    return this.service.findPublished(query)
  }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.service.findOneBySlug(slug)
  }

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Post()
  create(@Req() req: Request, @Body() dto: CreateContentDto) {
    return this.service.create(req.user.id, dto)
  }

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Patch(':id')
  update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() dto: UpdateContentDto,
  ) {
    return this.service.update(id, dto, req.user.id, req.user.role)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  archive(@Param('id') id: string) {
    return this.service.archive(id)
  }
}
```

- [ ] **Step 4: Write ContentsModule**

Create `src/contents/contents.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Content } from '../entities/content.entity'
import { ContentTerm } from '../entities/content-term.entity'
import { ContentsService } from './contents.service'
import { ContentsController } from './contents.controller'
import { SeoModule } from '../seo/seo.module'
import { ContentTypesModule } from '../content-types/content-types.module'

@Module({
  imports: [
    TypeOrmModule.forFeature([Content, ContentTerm]),
    SeoModule,
    ContentTypesModule,
  ],
  controllers: [ContentsController],
  providers: [ContentsService],
  exports: [ContentsService],
})
export class ContentsModule {}
```

- [ ] **Step 5: Register in AppModule and verify**

Add `ContentsModule` and `SeoModule` to `src/app.module.ts` imports. Run: `bun run build`

- [ ] **Step 6: Commit**

```bash
git add src/contents/ src/seo/ src/app.module.ts
git commit -m "feat: add contents module with publish workflow, SEO, terms"
```

---

## Chunk 5: Menus + Media

### Task 12: Menus module

**Files:**
- Create: `src/menus/dto/create-menu.dto.ts`
- Create: `src/menus/dto/create-menu-item.dto.ts`
- Create: `src/menus/dto/update-menu-item.dto.ts`
- Create: `src/menus/dto/reorder-menu-items.dto.ts`
- Create: `src/menus/menus.service.ts`
- Create: `src/menus/menus.controller.ts`
- Create: `src/menus/menu-items/menu-items.service.ts`
- Create: `src/menus/menu-items/menu-items.controller.ts`
- Create: `src/menus/menus.module.ts`

- [ ] **Step 1: Write DTOs**

Create `src/menus/dto/create-menu.dto.ts`:
```typescript
import { IsNotEmpty, IsOptional, IsString } from 'class-validator'

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  name: string

  @IsString()
  @IsNotEmpty()
  slug: string

  @IsOptional()
  @IsString()
  location?: string
}
```

Create `src/menus/dto/update-menu.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator'

export class UpdateMenuDto {
  @IsOptional()
  @IsString()
  name?: string

  @IsOptional()
  @IsString()
  slug?: string

  @IsOptional()
  @IsString()
  location?: string
}
```

Create `src/menus/dto/create-menu-item.dto.ts`:
```typescript
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator'
import { MenuItemType } from '../../entities/menu-item.entity'

export class CreateMenuItemDto {
  @IsEnum(MenuItemType)
  type: MenuItemType

  @IsOptional()
  @IsUUID()
  targetId?: string

  @IsOptional()
  @IsString()
  url?: string

  @IsString()
  @IsNotEmpty()
  label: string

  @IsOptional()
  @IsUUID()
  parentId?: string

  @IsOptional()
  @IsString()
  cssClass?: string

  @IsOptional()
  @IsString()
  targetAttr?: string
}
```

Create `src/menus/dto/update-menu-item.dto.ts`:
```typescript
import { IsOptional, IsString } from 'class-validator'

export class UpdateMenuItemDto {
  @IsOptional()
  @IsString()
  label?: string

  @IsOptional()
  @IsString()
  url?: string

  @IsOptional()
  @IsString()
  cssClass?: string

  @IsOptional()
  @IsString()
  targetAttr?: string

  @IsOptional()
  parentId?: string
}
```

Create `src/menus/dto/reorder-menu-items.dto.ts`:
```typescript
import { IsArray, IsInt, IsOptional, IsUUID, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'

class ReorderItem {
  @IsUUID()
  id: string

  @IsInt()
  sortOrder: number

  @IsOptional()
  @IsUUID()
  parentId?: string
}

export class ReorderMenuItemsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReorderItem)
  items: ReorderItem[]
}
```

- [ ] **Step 2: Write MenusService**

Create `src/menus/menus.service.ts`:
```typescript
import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Menu } from '../entities/menu.entity'
import { CreateMenuDto } from './dto/create-menu.dto'
import { UpdateMenuDto } from './dto/update-menu.dto'

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(Menu)
    private repo: Repository<Menu>,
  ) {}

  async create(dto: CreateMenuDto) {
    const exists = await this.repo.findOne({ where: { slug: dto.slug } })
    if (exists) throw new ConflictException(`Menu "${dto.slug}" already exists`)
    return this.repo.save(this.repo.create(dto))
  }

  async findAll() {
    return this.repo.find({ order: { createdAt: 'DESC' } })
  }

  async findOne(slug: string) {
    const menu = await this.repo.findOne({
      where: { slug },
      relations: ['items'],
    })
    if (!menu) throw new NotFoundException(`Menu "${slug}" not found`)
    return menu
  }

  async getMenuTree(slug: string) {
    const menu = await this.findOne(slug)
    return this.buildTree(menu.items ?? [])
  }

  async update(slug: string, dto: UpdateMenuDto) {
    const menu = await this.findOne(slug)
    Object.assign(menu, dto)
    return this.repo.save(menu)
  }

  async remove(slug: string) {
    const menu = await this.findOne(slug)
    await this.repo.remove(menu)
  }

  private buildTree(items: unknown[]) {
    const menuItemEntities = items as import('../entities/menu-item.entity').MenuItem[]
    const map = new Map<string, typeof menuItemEntities[number] & { children: typeof menuItemEntities }>()
    const roots: typeof menuItemEntities = []

    for (const item of menuItemEntities) {
      map.set(item.id, { ...item, children: [] })
    }

    for (const item of menuItemEntities) {
      const node = map.get(item.id)!
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    roots.sort((a, b) => a.sortOrder - b.sortOrder)
    return roots
  }
}
```

- [ ] **Step 3: Write MenuItemsService**

Create `src/menus/menu-items/menu-items.service.ts`:
```typescript
import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MenuItem } from '../../entities/menu-item.entity'
import { CreateMenuItemDto } from '../dto/create-menu-item.dto'
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto'
import { ReorderMenuItemsDto } from '../dto/reorder-menu-items.dto'

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectRepository(MenuItem)
    private repo: Repository<MenuItem>,
  ) {}

  async create(menuId: string, dto: CreateMenuItemDto) {
    const maxOrder = await this.repo
      .createQueryBuilder('mi')
      .where('mi.menuId = :menuId', { menuId })
      .select('COALESCE(MAX(mi.sortOrder), -1)', 'max')
      .getRawOne()

    return this.repo.save(
      this.repo.create({
        ...dto,
        menuId,
        sortOrder: (maxOrder?.max ?? -1) + 1,
      }),
    )
  }

  async update(id: string, dto: UpdateMenuItemDto) {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) throw new NotFoundException()
    Object.assign(item, dto)
    return this.repo.save(item)
  }

  async remove(id: string) {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) throw new NotFoundException()
    await this.repo.remove(item)
  }

  async reorder(dto: ReorderMenuItemsDto) {
    for (const item of dto.items) {
      await this.repo.update(item.id, {
        sortOrder: item.sortOrder,
        parentId: item.parentId ?? null,
      })
    }
  }
}
```

- [ ] **Step 4: Write MenusController**

Create `src/menus/menus.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { MenusService } from './menus.service'
import { CreateMenuDto } from './dto/create-menu.dto'
import { UpdateMenuDto } from './dto/update-menu.dto'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../entities/user.entity'
import { Public } from '../common/decorators/public.decorator'

@Controller('menus')
export class MenusController {
  constructor(private service: MenusService) {}

  @Public()
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.service.getMenuTree(slug)
  }

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateMenuDto) {
    return this.service.create(dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateMenuDto) {
    return this.service.update(slug, dto)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.service.remove(slug)
  }
}
```

- [ ] **Step 5: Write MenuItemsController**

Create `src/menus/menu-items/menu-items.controller.ts`:
```typescript
import {
  Controller,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common'
import { MenuItemsService } from './menu-items.service'
import { MenusService } from '../menus.service'
import { CreateMenuItemDto } from '../dto/create-menu-item.dto'
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto'
import { ReorderMenuItemsDto } from '../dto/reorder-menu-items.dto'
import { Roles } from '../../common/decorators/roles.decorator'
import { UserRole } from '../../entities/user.entity'

@Controller('menus/:slug/items')
export class MenuItemsController {
  constructor(
    private service: MenuItemsService,
    private menusService: MenusService,
  ) {}

  @Roles(UserRole.ADMIN)
  @Post()
  async create(
    @Param('slug') slug: string,
    @Body() dto: CreateMenuItemDto,
  ) {
    const menu = await this.menusService.findOne(slug)
    return this.service.create(menu.id, dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch('reorder')
  async reorder(@Body() dto: ReorderMenuItemsDto) {
    return this.service.reorder(dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMenuItemDto,
  ) {
    return this.service.update(id, dto)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  async remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
```

- [ ] **Step 6: Write MenusModule**

Create `src/menus/menus.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Menu } from '../entities/menu.entity'
import { MenuItem } from '../entities/menu-item.entity'
import { MenusService } from './menus.service'
import { MenusController } from './menus.controller'
import { MenuItemsService } from './menu-items/menu-items.service'
import { MenuItemsController } from './menu-items/menu-items.controller'

@Module({
  imports: [TypeOrmModule.forFeature([Menu, MenuItem])],
  controllers: [MenusController, MenuItemsController],
  providers: [MenusService, MenuItemsService],
  exports: [MenusService],
})
export class MenusModule {}
```

- [ ] **Step 7: Register in AppModule and verify**

Add `MenusModule` to `src/app.module.ts`. Run: `bun run build`

- [ ] **Step 8: Commit**

```bash
git add src/menus/ src/app.module.ts
git commit -m "feat: add menus module with items CRUD and tree resolution"
```

---

### Task 13: Media module with local storage

**Files:**
- Create: `src/media/storage/storage.interface.ts`
- Create: `src/media/storage/local.storage.ts`
- Create: `src/media/dto/upload-response.dto.ts`
- Create: `src/media/media.service.ts`
- Create: `src/media/media.controller.ts`
- Create: `src/media/media.module.ts`

- [ ] **Step 1: Write storage interface**

Create `src/media/storage/storage.interface.ts`:
```typescript
export const STORAGE_PROVIDER = 'IStorageProvider'

export interface IStorageProvider {
  upload(file: Buffer, key: string, contentType: string): Promise<string>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}
```

- [ ] **Step 2: Write local storage provider**

Create `src/media/storage/local.storage.ts`:
```typescript
import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import * as fs from 'node:fs/promises'
import * as path from 'node:path'
import { IStorageProvider } from './storage.interface'

@Injectable()
export class LocalStorageProvider implements IStorageProvider {
  private uploadDir: string

  constructor(private config: ConfigService) {
    this.uploadDir = this.config.get<string>('UPLOAD_DIR', './uploads')
  }

  async upload(file: Buffer, key: string, _contentType: string): Promise<string> {
    const fullPath = path.join(this.uploadDir, key)
    await fs.mkdir(path.dirname(fullPath), { recursive: true })
    await fs.writeFile(fullPath, file)
    return key
  }

  async delete(key: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, key)
    try {
      await fs.unlink(fullPath)
    } catch {
      // File already deleted — ignore
    }
  }

  getUrl(key: string): string {
    return `/uploads/${key}`
  }
}
```

- [ ] **Step 3: Write upload response DTO**

Create `src/media/dto/upload-response.dto.ts`:
```typescript
export class UploadResponseDto {
  id: string
  filename: string
  originalName: string
  mimeType: string
  sizeBytes: number
  url: string
}
```

- [ ] **Step 4: Write MediaService**

Create `src/media/media.service.ts`:
```typescript
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuid } from 'uuid'
import { Media } from '../entities/media.entity'
import { STORAGE_PROVIDER, IStorageProvider } from './storage/storage.interface'
import { UploadResponseDto } from './dto/upload-response.dto'

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private repo: Repository<Media>,
    @Inject(STORAGE_PROVIDER) private storage: IStorageProvider,
  ) {}

  async upload(
    file: { buffer: Buffer; originalname: string; mimetype: string; size: number },
    userId: string,
  ): Promise<UploadResponseDto> {
    const ext = file.originalname.split('.').pop()
    const datePath = new Date().toISOString().slice(0, 10).replace(/-/g, '/')
    const filename = `${uuid()}.${ext}`
    const key = `${datePath}/${filename}`

    await this.storage.upload(file.buffer, key, file.mimetype)

    const media = this.repo.create({
      filename,
      originalName: file.originalname,
      mimeType: file.mimetype,
      sizeBytes: file.size,
      path: key,
      uploadedBy: userId,
    })
    const saved = await this.repo.save(media)

    return {
      id: saved.id,
      filename: saved.filename,
      originalName: saved.originalName,
      mimeType: saved.mimeType,
      sizeBytes: saved.sizeBytes,
      url: this.storage.getUrl(key),
    }
  }

  async findAll(page = 1, limit = 20) {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })
    return {
      items: items.map((m) => ({ ...m, url: this.storage.getUrl(m.path) })),
      total,
      page,
      limit,
    }
  }

  async findOne(id: string) {
    const media = await this.repo.findOne({ where: { id } })
    if (!media) throw new NotFoundException()
    return { ...media, url: this.storage.getUrl(media.path) }
  }

  async remove(id: string) {
    const media = await this.repo.findOne({ where: { id } })
    if (!media) throw new NotFoundException()
    await this.storage.delete(media.path)
    await this.repo.remove(media)
  }
}
```

- [ ] **Step 5: Write MediaController**

Create `src/media/media.controller.ts`:
```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { Request } from 'express'
import { MediaService } from './media.service'
import { Roles } from '../common/decorators/roles.decorator'
import { Public } from '../common/decorators/public.decorator'
import { UserRole } from '../entities/user.entity'

@Controller('media')
export class MediaController {
  constructor(private service: MediaService) {}

  @Get()
  findAll(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.service.findAll(
      parseInt(page ?? '1', 10),
      parseInt(limit ?? '20', 10),
    )
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id)
  }

  @Roles(UserRole.EDITOR, UserRole.ADMIN)
  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Req() req: Request,
  ) {
    return this.service.upload(file, req.user.id)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.service.remove(id)
  }
}
```

- [ ] **Step 6: Write MediaModule**

Create `src/media/media.module.ts`:
```typescript
import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Media } from '../entities/media.entity'
import { MediaService } from './media.service'
import { MediaController } from './media.controller'
import { LocalStorageProvider } from './storage/local.storage'
import { STORAGE_PROVIDER } from './storage/storage.interface'

@Module({
  imports: [TypeOrmModule.forFeature([Media])],
  controllers: [MediaController],
  providers: [
    MediaService,
    { provide: STORAGE_PROVIDER, useClass: LocalStorageProvider },
  ],
  exports: [MediaService],
})
export class MediaModule {}
```

- [ ] **Step 7: Register in AppModule and verify**

Add `MediaModule` to `src/app.module.ts`. Run: `bun run build`

- [ ] **Step 8: Commit**

```bash
git add src/media/ src/app.module.ts src/main.ts
git commit -m "feat: add media module with local storage provider"
```

---

## Chunk 6: Seed Script + Final Wiring

### Task 14: Seed script for initial data

**Files:**
- Create: `src/seed.ts`

- [ ] **Step 1: Write seed script**

Create `src/seed.ts`:
```typescript
import { DataSource } from 'typeorm'
import * as bcrypt from 'bcrypt'
import { User, UserRole } from './entities/user.entity'
import { ContentType } from './entities/content-type.entity'
import { Taxonomy, TaxonomyType } from './entities/taxonomy.entity'

async function seed() {
  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '5432', 10),
    username: process.env.DB_USERNAME ?? 'postgres',
    password: process.env.DB_PASSWORD ?? 'postgres',
    database: process.env.DB_DATABASE ?? 'headless_cms',
    entities: [User, ContentType, Taxonomy],
    synchronize: true,
  })

  await dataSource.initialize()
  console.log('Seeding database...')

  const userRepo = dataSource.getRepository(User)
  const ctRepo = dataSource.getRepository(ContentType)
  const taxRepo = dataSource.getRepository(Taxonomy)

  // Admin user
  const adminExists = await userRepo.findOne({ where: { email: 'admin@example.com' } })
  if (!adminExists) {
    await userRepo.save({
      email: 'admin@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      displayName: 'Admin',
      role: UserRole.ADMIN,
    })
  }

  // Editor user
  const editorExists = await userRepo.findOne({ where: { email: 'editor@example.com' } })
  if (!editorExists) {
    await userRepo.save({
      email: 'editor@example.com',
      passwordHash: await bcrypt.hash('password123', 10),
      displayName: 'Editor',
      role: UserRole.EDITOR,
    })
  }

  // Built-in content types
  const postType = await ctRepo.findOne({ where: { slug: 'post' } })
  if (!postType) {
    await ctRepo.save({ name: 'Post', slug: 'post', isBuiltin: true, schemaJsonb: {} })
  }

  const pageType = await ctRepo.findOne({ where: { slug: 'page' } })
  if (!pageType) {
    await ctRepo.save({ name: 'Page', slug: 'page', isBuiltin: true, schemaJsonb: {} })
  }

  // Built-in taxonomies
  const catTax = await taxRepo.findOne({ where: { slug: 'category' } })
  if (!catTax) {
    await taxRepo.save({ name: 'Categories', slug: 'category', type: TaxonomyType.HIERARCHICAL, isBuiltin: true })
  }

  const tagTax = await taxRepo.findOne({ where: { slug: 'post_tag' } })
  if (!tagTax) {
    await taxRepo.save({ name: 'Tags', slug: 'post_tag', type: TaxonomyType.FLAT, isBuiltin: true })
  }

  await dataSource.destroy()
  console.log('Seed complete.')
}

seed().catch((err) => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add seed script to package.json**

Add to scripts:
```json
"seed": "bun run src/seed.ts"
```

- [ ] **Step 3: Test seed**

Ensure PostgreSQL is running, then: `bun run seed`
Expected: "Seed complete." with no errors.

- [ ] **Step 4: Commit**

```bash
git add src/seed.ts package.json
git commit -m "feat: add seed script with admin/editor users and built-in types"
```

---

### Task 15: Verify full build and lint

- [ ] **Step 1: Run build**

Run: `bun run build`
Expected: Compiles without errors.

- [ ] **Step 2: Run lint**

Run: `bun run lint`
Fix any issues found.

- [ ] **Step 3: Run tests**

Run: `bun run test`
Fix any issues found.

- [ ] **Step 4: Start dev server**

Run: `bun run start:dev`
Expected: Server starts on port 3000, TypeORM connects to PostgreSQL, no errors in console.

- [ ] **Step 5: Test auth flow**

```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@example.com","password":"password123"}'

# Should return accessToken + set refresh_token cookie
```

- [ ] **Step 6: Final commit**

```bash
git add -A
git commit -m "chore: final build verification and lint fixes"
```
