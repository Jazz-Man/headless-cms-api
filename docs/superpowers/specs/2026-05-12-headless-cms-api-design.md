# Headless CMS API — Design Specification

## 1. Overview

API-first content management system inspired by WordPress, but headless-only. Provides structured data for any frontend (Next.js, Vue, React Native, etc.) via REST API. Built with NestJS 11, TypeORM, PostgreSQL.

Key WP-like features: custom post types, hierarchical taxonomies, Yoast-level SEO, navigation menus.

Development is phased: core first, then production hardening, then extensions.

## 2. Database Schema (PostgreSQL)

### `users`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| email | VARCHAR(255) | UNIQUE, NOT NULL |
| password_hash | VARCHAR(255) | NOT NULL |
| display_name | VARCHAR(100) | |
| role | ENUM('admin','editor','viewer') | DEFAULT 'viewer' |
| is_active | BOOLEAN | DEFAULT true |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `content_types`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| name | VARCHAR(100) | NOT NULL — "Post", "Page", "Product" |
| slug | VARCHAR(100) | UNIQUE — "post", "page", "product" |
| schema_jsonb | JSONB | Describes custom fields for validation |
| is_builtin | BOOLEAN | DEFAULT false — for system types (post, page) |
| created_at | TIMESTAMP | |

### `contents`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| type_id | UUID (FK → content_types) | NOT NULL |
| title | VARCHAR(500) | NOT NULL |
| slug | VARCHAR(500) | UNIQUE per type_id |
| excerpt | TEXT | Short description |
| body_jsonb | JSONB | Custom fields per content type |
| status | ENUM('draft','published','archived') | DEFAULT 'draft' |
| author_id | UUID (FK → users) | |
| published_at | TIMESTAMP | NULL for drafts |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Indexes: `UNIQUE(slug, type_id)`, `INDEX(status, published_at)`, `GIN(body_jsonb)`

### `seo_meta`

Separate table instead of JSONB for efficient querying and canonical URL uniqueness.

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| entity_type | ENUM('content','category','taxonomy') | Polymorphic relation |
| entity_id | UUID | ID of content or term |
| meta_title | VARCHAR(60) | |
| meta_description | VARCHAR(160) | |
| og_title | VARCHAR(100) | |
| og_description | VARCHAR(200) | |
| og_image | VARCHAR(500) | URL |
| canonical_url | VARCHAR(500) | |
| robots_index | BOOLEAN | DEFAULT true |
| robots_follow | BOOLEAN | DEFAULT true |
| focus_keyword | VARCHAR(200) | Yoast-style |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

UNIQUE(entity_type, entity_id) — one SEO record per entity.

### `taxonomies`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| name | VARCHAR(100) | "Categories", "Tags" |
| slug | VARCHAR(100) | UNIQUE — "category", "post_tag" |
| type | ENUM('hierarchical','flat') | Categories = hierarchical, tags = flat |
| is_builtin | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | |

### `terms`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| taxonomy_id | UUID (FK → taxonomies) | |
| name | VARCHAR(200) | |
| slug | VARCHAR(200) | UNIQUE per taxonomy_id |
| description | TEXT | |
| parent_id | UUID (FK → terms, nullable) | For hierarchical |
| sort_order | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMP | |

### `content_terms`

| Column | Type | Notes |
|--------|------|-------|
| content_id | UUID (FK → contents) | |
| term_id | UUID (FK → terms) | |

PK: (content_id, term_id)

### `menus`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| name | VARCHAR(100) | "Main Menu", "Footer Menu" |
| slug | VARCHAR(100) | UNIQUE — "main", "footer" |
| location | VARCHAR(50) | Nullable — "primary", "footer" |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

### `menu_items`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| menu_id | UUID (FK → menus) | NOT NULL |
| parent_id | UUID (FK → menu_items, nullable) | For nested items |
| type | ENUM('content','term','custom') | What it links to |
| target_id | UUID (nullable) | Content or term ID |
| url | VARCHAR(500) | For type='custom' |
| label | VARCHAR(200) | Menu item text |
| css_class | VARCHAR(100) | Nullable |
| target_attr | VARCHAR(10) | DEFAULT '_self', or '_blank' |
| sort_order | INTEGER | DEFAULT 0 |
| created_at | TIMESTAMP | |
| updated_at | TIMESTAMP | |

Indexes: `INDEX(menu_id, sort_order)`, `INDEX(parent_id)`

### `media`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| filename | VARCHAR(255) | |
| original_name | VARCHAR(255) | |
| mime_type | VARCHAR(100) | |
| size_bytes | INTEGER | |
| path | VARCHAR(500) | Key/path in storage |
| alt_text | VARCHAR(255) | |
| uploaded_by | UUID (FK → users) | |
| created_at | TIMESTAMP | |

### `refresh_tokens`

| Column | Type | Notes |
|--------|------|-------|
| id | UUID (PK) | |
| user_id | UUID (FK → users) | |
| token_hash | VARCHAR(255) | Hashed refresh token |
| expires_at | TIMESTAMP | |
| is_revoked | BOOLEAN | DEFAULT false |
| created_at | TIMESTAMP | |

## 3. Module Architecture

```
src/
  main.ts                    # Bootstrap, global pipes, CORS, Helmet
  app.module.ts              # All module imports

  config/
    config.module.ts         # @nestjs/config, validation schema
    database.config.ts       # TypeORM connection
    storage.config.ts        # Storage provider config (local/S3)

  common/
    decorators/
      roles.decorator.ts     # @Roles('admin', 'editor')
      public.decorator.ts    # @Public() — skip auth guard
    guards/
      jwt-auth.guard.ts      # JWT verification
      roles.guard.ts         # RBAC check
    filters/
      http-exception.filter.ts
    interceptors/
      logging.interceptor.ts
    pipes/
      slug.pipe.ts           # Auto-generate slug from title

  auth/
    auth.module.ts
    auth.controller.ts       # POST /auth/login, /refresh, /logout, GET /auth/me
    auth.service.ts          # JWT generation, password hashing, refresh rotation
    dto/
      login.dto.ts
      refresh.dto.ts
    strategies/
      jwt.strategy.ts        # Passport JWT strategy

  content-types/
    content-types.module.ts
    content-types.controller.ts
    content-types.service.ts
    dto/
      create-content-type.dto.ts
      update-content-type.dto.ts

  contents/
    contents.module.ts
    contents.controller.ts
    contents.service.ts
    dto/
      create-content.dto.ts
      update-content.dto.ts
      query-contents.dto.ts

  taxonomies/
    taxonomies.module.ts
    taxonomies.controller.ts
    taxonomies.service.ts
    terms/
      terms.module.ts
      terms.controller.ts
      terms.service.ts

  seo/
    seo.module.ts
    seo.service.ts           # Upsert/read SEO meta for any entity
    seo.controller.ts        # GET /sitemap.xml (phase 3)
    dto/
      upsert-seo.dto.ts

  menus/
    menus.module.ts
    menus.controller.ts
    menus.service.ts
    menu-items/
      menu-items.controller.ts
      menu-items.service.ts
    dto/
      create-menu.dto.ts
      create-menu-item.dto.ts
      update-menu-item.dto.ts
      reorder-menu-items.dto.ts

  media/
    media.module.ts
    media.controller.ts
    media.service.ts
    storage/
      storage.interface.ts   # IStorageProvider
      local.storage.ts       # LocalStorageProvider (dev)
      s3.storage.ts          # S3StorageProvider (prod)
    dto/
      upload-response.dto.ts
```

### Key architectural decisions

- **Global AuthGuard** via `app.useGlobalGuards()`. Endpoints marked with `@Public()` skip auth. This avoids adding guards to every protected route.
- **SeoModule** has no write controller — SEO data is upserted through ContentsModule and TermsModule which inject SeoService. Only `GET /sitemap.xml` lives in SeoController.
- **MediaModule** uses `IStorageProvider` interface. Implementation selected via `STORAGE_DRIVER` env var.
- **Zod** validates `body_jsonb` against the schema stored in `content_types.schema_jsonb` when creating/updating content.

## 4. API Endpoints

### Auth

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| POST | `/auth/login` | Login, returns access + refresh | Public |
| POST | `/auth/refresh` | Refresh access token | Refresh cookie |
| POST | `/auth/logout` | Revoke refresh token | JWT |
| GET | `/auth/me` | Current user info | JWT |

### Content Types (admin only)

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/content-types` | List types | JWT (admin) |
| GET | `/content-types/:slug` | Type details + schema | JWT (admin) |
| POST | `/content-types` | Create type | JWT (admin) |
| PATCH | `/content-types/:slug` | Update schema | JWT (admin) |
| DELETE | `/content-types/:slug` | Delete type | JWT (admin) |

### Contents

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/contents` | Published list (paginated, filtered) | Public |
| GET | `/contents/:slug` | Content details + SEO + terms | Public |
| GET | `/contents/drafts` | Current user's drafts | JWT |
| POST | `/contents` | Create draft | JWT (editor/admin) |
| PATCH | `/contents/:id` | Update / publish | JWT (editor/admin) |
| DELETE | `/contents/:id` | Archive (soft delete) | JWT (admin) |

Query params for `GET /contents`: `?page=1&limit=20&type=post&status=published&taxonomy=category:tech&sort=-published_at&search=keyword`

### Taxonomies

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/taxonomies` | List taxonomies | Public |
| POST | `/taxonomies` | Create taxonomy | JWT (admin) |
| PATCH | `/taxonomies/:slug` | Update | JWT (admin) |
| DELETE | `/taxonomies/:slug` | Delete | JWT (admin) |

### Terms

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/taxonomies/:taxonomySlug/terms` | Terms (tree for hierarchical) | Public |
| GET | `/taxonomies/:taxonomySlug/terms/:slug` | Term details + SEO | Public |
| POST | `/taxonomies/:taxonomySlug/terms` | Create term | JWT (admin) |
| PATCH | `/taxonomies/:taxonomySlug/terms/:slug` | Update | JWT (admin) |
| DELETE | `/taxonomies/:taxonomySlug/terms/:slug` | Delete | JWT (admin) |

### Menus

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/menus` | List menus | Public |
| GET | `/menus/:slug` | Menu with items (tree) | Public |
| POST | `/menus` | Create menu | JWT (admin) |
| PATCH | `/menus/:slug` | Update menu | JWT (admin) |
| DELETE | `/menus/:slug` | Delete menu | JWT (admin) |
| POST | `/menus/:slug/items` | Add item | JWT (admin) |
| PATCH | `/menus/:slug/items/:id` | Update item | JWT (admin) |
| DELETE | `/menus/:slug/items/:id` | Delete item | JWT (admin) |
| PATCH | `/menus/:slug/items/reorder` | Reorder items | JWT (admin) |

`GET /menus/:slug` returns nested tree with resolved data — content title/slug or term name/slug, not just IDs.

### Media

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/media` | Uploads list (paginated) | JWT |
| POST | `/media/upload` | Upload file (multipart) | JWT (editor/admin) |
| GET | `/media/:id` | File metadata | Public |
| DELETE | `/media/:id` | Delete file | JWT (admin) |

### SEO

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/sitemap.xml` | XML sitemap | Public |

SEO data is included in `PATCH /contents/:id` and `PATCH /taxonomies/:taxonomySlug/terms/:slug` payloads. No separate write endpoints.

### Health

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/health` | DB + storage connectivity | Public |

## 5. Auth & RBAC

### JWT flow

**Login:** `POST /auth/login` → bcrypt compare → generate access token (15 min) + refresh token (7 days). Access in response body, refresh in `httpOnly` cookie with `SameSite=Strict`.

**Refresh:** `POST /auth/refresh` → read refresh from cookie → verify hash in DB, not revoked, not expired → generate new pair, old refresh marked `is_revoked=true`. Token rotation — each refresh invalidates the previous one.

**Logout:** `POST /auth/logout` → mark refresh as revoked, clear cookie.

### RBAC rules

| Role | Capabilities |
|------|-------------|
| admin | Everything: CRUD content types, taxonomies, terms, menus, delete any content, upload/delete media |
| editor | Create/edit any content, upload media, manage terms |
| viewer | Read-only access to published content (same as anon but with JWT identity) |

Editor can edit any content (like WP author/editor model). Architecture supports adding per-item ownership restrictions later.

### Guard setup

```
AppModule → useGlobalGuards(JwtAuthGuard, RolesGuard)
```

- `JwtAuthGuard` — verifies access token. `@Public()` decorator skips it.
- `RolesGuard` — reads `@Roles('admin')` from metadata. No decorator = any authenticated user.

## 6. Media Storage

### Interface

```typescript
interface IStorageProvider {
  upload(file: Buffer, key: string, contentType: string): Promise<string>
  delete(key: string): Promise<void>
  getUrl(key: string): string
}
```

### Configuration via env

```
STORAGE_DRIVER=local     # or s3
UPLOAD_DIR=./uploads     # for local
S3_BUCKET=               # for s3
S3_REGION=
S3_ACCESS_KEY=
S3_SECRET_KEY=
```

**Local** — stores files in `UPLOAD_DIR`, served via express.static at `/uploads/*`.

**S3** — `@aws-sdk/client-s3`, generates presigned or public URLs depending on bucket config.

Files organized by date: `uploads/2024/05/12/<uuid>-filename.jpg` (WP-style).

## 7. Phased Roadmap

### Phase 1 — MVP (core)

- ConfigModule + TypeORM + PostgreSQL connection
- AuthModule (login/refresh/logout/me)
- ContentTypesModule (CRUD)
- ContentsModule (CRUD + publish workflow)
- TaxonomiesModule + TermsModule
- SeoModule (SEO meta for content and terms)
- MenusModule (menus + menu items)
- MediaModule (storage abstraction, local driver)
- Global error handling, validation pipes, slug auto-generation

### Phase 2 — Production readiness

- CacheModule (Redis, cache-aside pattern)
- HealthModule (@nestjs/terminus)
- Rate limiting (@nestjs/throttler)
- Helmet, CORS whitelist
- Structured logging (pino)
- S3 storage driver
- Graceful shutdown

### Phase 3 — Extensions

- Sitemap.xml generation
- Content revisions / versioning
- Webhooks (publish → POST to external URL)
- Bulk operations
- Custom roles/permissions (if needed)
