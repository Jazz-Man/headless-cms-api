import { INestApplication, Logger, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { DataSource, Repository } from 'typeorm'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { Content } from '../src/entities/content.entity'
import { ContentType } from '../src/entities/content-type.entity'
import { Menu } from '../src/entities/menu.entity'
import { MenuItem } from '../src/entities/menu-item.entity'
import { Taxonomy } from '../src/entities/taxonomy.entity'
import { Term } from '../src/entities/term.entity'
import { User, UserRole } from '../src/entities/user.entity'

// Override DB_DATABASE only so the app uses the test
// database. JWT vars are left to .env defaults so that
// the signing and verification secrets stay consistent.
process.env.DB_DATABASE = 'headless_cms_test'

describe('API (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let userRepo: Repository<User>
  let ctRepo: Repository<ContentType>
  let taxRepo: Repository<Taxonomy>

  let adminToken: string
  let editorToken: string

  const adminEmail = 'admin-test@example.com'
  const editorEmail = 'editor-test@example.com'
  const password = 'password123'

  beforeAll(async () => {
    Logger.overrideLogger(false)

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    app.setGlobalPrefix('api')
    app.use(cookieParser())
    app.useGlobalPipes(
      new ValidationPipe({
        forbidNonWhitelisted: true,
        transform: true,
        whitelist: true,
      }),
    )
    app.useGlobalFilters(new HttpExceptionFilter())

    await app.init()

    dataSource = app.get(DataSource)

    // Drop and re-create all tables for a clean state
    await dataSource.dropDatabase()
    await dataSource.synchronize()

    userRepo = dataSource.getRepository(User)
    ctRepo = dataSource.getRepository(ContentType)
    taxRepo = dataSource.getRepository(Taxonomy)

    await seedDatabase()
  }, 60_000)

  afterAll(async () => {
    if (dataSource?.isInitialized) {
      await dataSource.dropDatabase()
    }
    if (app) {
      await app.close()
    }
  })

  async function seedDatabase() {
    await userRepo.save([
      userRepo.create({
        displayName: 'Test Admin',
        email: adminEmail,
        isActive: true,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.ADMIN,
      }),
      userRepo.create({
        displayName: 'Test Editor',
        email: editorEmail,
        isActive: true,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.EDITOR,
      }),
    ])

    await ctRepo.save([
      ctRepo.create({
        isBuiltin: true,
        name: 'Post',
        schemaJsonb: {},
        slug: 'post',
      }),
      ctRepo.create({
        isBuiltin: true,
        name: 'Page',
        schemaJsonb: {},
        slug: 'page',
      }),
    ])

    await taxRepo.save([
      taxRepo.create({
        isBuiltin: true,
        name: 'Categories',
        slug: 'category',
        type: 'hierarchical',
      }),
      taxRepo.create({
        isBuiltin: true,
        name: 'Tags',
        slug: 'post_tag',
        type: 'flat',
      }),
    ])
  }

  async function login(
    email: string,
    pw: string,
  ): Promise<{ accessToken: string; refreshCookie: string }> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: pw })
      .expect(201)

    const cookies = res.headers['set-cookie'] as string[]
    const rawCookie = cookies?.find((c) => c.startsWith('refresh_token=')) ?? ''
    // Extract just "refresh_token=eyJ..." without the Set-Cookie
    // attributes (Path, HttpOnly, etc.) so it works with
    // supertest's set('Cookie', ...).
    const refreshCookie = rawCookie.split(';')[0]

    return {
      accessToken: res.body.accessToken,
      refreshCookie,
    }
  }

  // ─── Auth Suite ───────────────────────────────────────────────

  describe('Auth', () => {
    it('POST /api/auth/login — success with admin creds', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminEmail, password })
        .expect(201)

      expect(res.body.accessToken).toBeDefined()
      expect(res.body.user).toBeDefined()
      expect(res.body.user.email).toBe(adminEmail)
      expect(res.body.user.role).toBe(UserRole.ADMIN)

      adminToken = res.body.accessToken

      // Also login editor for later suites
      const editorRes = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: editorEmail, password })
        .expect(201)

      editorToken = editorRes.body.accessToken
    })

    it('POST /api/auth/login — fail with wrong password', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: adminEmail, password: 'wrong-password' })
        .expect(401)

      expect(res.body.message).toBe('Invalid credentials')
    })

    it('POST /api/auth/login — fail with nonexistent email', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'noone@example.com', password })
        .expect(401)

      expect(res.body.message).toBe('Invalid credentials')
    })

    it('POST /api/auth/login — fail with invalid input', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: '123' })
        .expect(400)
    })

    it('GET /api/auth/me — success with valid token', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.email).toBe(adminEmail)
      expect(res.body.role).toBe(UserRole.ADMIN)
      expect(res.body.id).toBeDefined()
      expect(res.body.isActive).toBe(true)
    })

    it('GET /api/auth/me — fail without token', async () => {
      await request(app.getHttpServer()).get('/api/auth/me').expect(401)
    })

    it('POST /api/auth/refresh — success with valid cookie', async () => {
      const { refreshCookie } = await login(adminEmail, password)

      const res = await request(app.getHttpServer())
        .post('/api/auth/refresh')
        .set('Cookie', refreshCookie)
        .expect(201)

      expect(res.body.accessToken).toBeDefined()

      adminToken = res.body.accessToken
    })

    it('POST /api/auth/refresh — fail without cookie', async () => {
      await request(app.getHttpServer()).post('/api/auth/refresh').expect(500)
    })

    it('POST /api/auth/logout — clears cookie', async () => {
      const { accessToken, refreshCookie } = await login(adminEmail, password)

      const res = await request(app.getHttpServer())
        .post('/api/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`)
        .set('Cookie', refreshCookie)
        .expect(204)

      const cookies = res.headers['set-cookie'] as string[]
      const cleared = cookies?.find(
        (c) => c.startsWith('refresh_token=') && c.includes('Expires='),
      )
      expect(cleared).toBeDefined()
    })
  })

  // ─── Content Types Suite ──────────────────────────────────────

  describe('Content Types', () => {
    it('POST — create new content type', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Article', slug: 'article' })
        .expect(201)

      expect(res.body.slug).toBe('article')
      expect(res.body.name).toBe('Article')
    })

    it('POST — reject duplicate slug', async () => {
      await request(app.getHttpServer())
        .post('/api/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Article Again', slug: 'article' })
        .expect(409)
    })

    it('POST — reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/content-types')
        .send({ name: 'NoAuth', slug: 'noauth' })
        .expect(401)
    })

    it('GET — list all', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/content-types')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(3)

      const slugs = res.body.map((ct: ContentType) => ct.slug)
      expect(slugs).toContain('post')
      expect(slugs).toContain('page')
      expect(slugs).toContain('article')
    })

    it('GET :slug — get by slug', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/content-types/post')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.slug).toBe('post')
      expect(res.body.name).toBe('Post')
    })

    it('GET :slug — 404 for missing', async () => {
      await request(app.getHttpServer())
        .get('/api/content-types/nonexistent')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })

    it('PATCH :slug — update', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/content-types/article')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Articles' })
        .expect(200)

      expect(res.body.name).toBe('Articles')
      expect(res.body.slug).toBe('article')
    })

    it('DELETE :slug — delete', async () => {
      const res = await request(app.getHttpServer())
        .delete('/api/content-types/article')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.message).toContain('article')
    })
  })

  // ─── Contents Suite ───────────────────────────────────────────

  describe('Contents', () => {
    let createdContentId: string

    it('POST — create content for "post" type', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          excerpt: 'A test post excerpt',
          slug: 'my-first-post',
          title: 'My First Post',
          typeSlug: 'post',
        })
        .expect(201)

      expect(res.body.title).toBe('My First Post')
      expect(res.body.slug).toBe('my-first-post')
      expect(res.body.status).toBe('draft')
      expect(res.body.id).toBeDefined()
      createdContentId = res.body.id
    })

    it('POST — auto-generate slug when omitted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Auto Slug Post', typeSlug: 'post' })
        .expect(201)

      expect(res.body.slug).toBe('auto-slug-post')
    })

    it('POST — reject without auth', async () => {
      await request(app.getHttpServer())
        .post('/api/contents')
        .send({ title: 'NoAuth', typeSlug: 'post' })
        .expect(401)
    })

    it('GET — list published contents', async () => {
      // Publish the content first
      await request(app.getHttpServer())
        .patch(`/api/contents/${createdContentId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ status: 'published' })

      const res = await request(app.getHttpServer())
        .get('/api/contents')
        .expect(200)

      expect(res.body.items).toBeDefined()
      expect(res.body.total).toBeDefined()
      expect(res.body.page).toBe(1)
      expect(Array.isArray(res.body.items)).toBe(true)
    })

    it('GET — filter by type', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/contents?type=post')
        .expect(200)

      expect(Array.isArray(res.body.items)).toBe(true)
      for (const item of res.body.items) {
        expect(item.contentType.slug).toBe('post')
      }
    })

    it('GET :slug — get by slug (public)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/contents/my-first-post')
        .expect(200)

      expect(res.body.title).toBe('My First Post')
      expect(res.body.slug).toBe('my-first-post')
    })

    it('GET :slug — 404 for missing', async () => {
      await request(app.getHttpServer())
        .get('/api/contents/nonexistent')
        .expect(404)
    })

    it('PATCH :id — update content', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/contents/${createdContentId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Updated Post Title' })
        .expect(200)

      expect(res.body.title).toBe('Updated Post Title')
    })

    it('PATCH :id — reject edit by non-author editor', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Admin Post', typeSlug: 'post' })
        .expect(201)

      await request(app.getHttpServer())
        .patch(`/api/contents/${createRes.body.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Hacked Title' })
        .expect(403)
    })

    it('DELETE :id — archive content (admin only)', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/contents/${createdContentId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(res.body.status).toBe('archived')
    })

    it('DELETE :id — reject editor (non-admin)', async () => {
      const createRes = await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Editor Deletion Test', typeSlug: 'post' })
        .expect(201)

      await request(app.getHttpServer())
        .delete(`/api/contents/${createRes.body.id}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(403)
    })
  })

  // ─── Taxonomies + Terms Suite ─────────────────────────────────

  describe('Taxonomies + Terms', () => {
    it('GET /api/taxonomies — list taxonomies (public)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/taxonomies')
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      const slugs = res.body.map((t: Taxonomy) => t.slug)
      expect(slugs).toContain('category')
      expect(slugs).toContain('post_tag')
    })

    it('POST /api/taxonomies — create taxonomy (admin)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/taxonomies')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Sections', slug: 'section', type: 'flat' })
        .expect(201)

      expect(res.body.slug).toBe('section')
      expect(res.body.name).toBe('Sections')
    })

    it('PATCH /api/taxonomies/:slug — update', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/taxonomies/section')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Blog Sections' })
        .expect(200)

      expect(res.body.name).toBe('Blog Sections')
    })

    it('POST /:taxonomySlug/terms — create term', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/taxonomies/category/terms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          description: 'Tech articles',
          name: 'Technology',
          slug: 'technology',
        })
        .expect(201)

      expect(res.body.slug).toBe('technology')
      expect(res.body.name).toBe('Technology')
    })

    it('POST /:taxonomySlug/terms — create child term', async () => {
      const listRes = await request(app.getHttpServer())
        .get('/api/taxonomies/category/terms')
        .expect(200)

      const parentId = listRes.body[0]?.id
      expect(parentId).toBeDefined()

      const res = await request(app.getHttpServer())
        .post('/api/taxonomies/category/terms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          name: 'JavaScript',
          parentId,
          slug: 'javascript',
        })
        .expect(201)

      expect(res.body.slug).toBe('javascript')
    })

    it('GET /:taxonomySlug/terms — hierarchical tree', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/taxonomies/category/terms')
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      const tech = res.body.find(
        (t: Term & { children?: Term[] }) => t.slug === 'technology',
      )
      expect(tech).toBeDefined()
    })

    it('GET /:taxonomySlug/terms — flat list', async () => {
      await request(app.getHttpServer())
        .post('/api/taxonomies/post_tag/terms')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'NestJS', slug: 'nestjs' })
        .expect(201)

      const res = await request(app.getHttpServer())
        .get('/api/taxonomies/post_tag/terms')
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })

    it('GET /:taxonomySlug/terms/:slug — get term', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/taxonomies/category/terms/technology')
        .expect(200)

      expect(res.body.slug).toBe('technology')
      expect(res.body.name).toBe('Technology')
    })

    it('PATCH /:taxonomySlug/terms/:slug — update', async () => {
      const res = await request(app.getHttpServer())
        .patch('/api/taxonomies/category/terms/technology')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Tech' })
        .expect(200)

      expect(res.body.name).toBe('Tech')
    })

    it('DELETE /:taxonomySlug/terms/:slug — delete term', async () => {
      await request(app.getHttpServer())
        .delete('/api/taxonomies/category/terms/javascript')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('DELETE /api/taxonomies/:slug — delete taxonomy', async () => {
      await request(app.getHttpServer())
        .delete('/api/taxonomies/section')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })
  })

  // ─── Menus + Menu Items Suite ─────────────────────────────────

  describe('Menus + Menu Items', () => {
    const menuSlug = 'main-menu'

    it('POST /api/menus — create menu', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/menus')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          location: 'header',
          name: 'Main Menu',
          slug: menuSlug,
        })
        .expect(201)

      expect(res.body.slug).toBe(menuSlug)
      expect(res.body.name).toBe('Main Menu')
      expect(res.body.location).toBe('header')
    })

    it('POST /api/menus — reject editor', async () => {
      await request(app.getHttpServer())
        .post('/api/menus')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Nope', slug: 'nope-menu' })
        .expect(403)
    })

    it('GET /api/menus — list menus (public)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/menus')
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
    })

    it('GET /api/menus/:slug — get menu with items', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/menus/${menuSlug}`)
        .expect(200)

      expect(res.body.slug).toBe(menuSlug)
      expect(res.body.items).toBeDefined()
      expect(Array.isArray(res.body.items)).toBe(true)
    })

    let menuItemId: string

    it('POST /:slug/items — add menu item', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/menus/${menuSlug}/items`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'Home', type: 'custom', url: '/' })
        .expect(201)

      expect(res.body.label).toBe('Home')
      expect(res.body.type).toBe('custom')
      expect(res.body.menuId).toBeDefined()
      menuItemId = res.body.id
    })

    it('POST /:slug/items — add another item', async () => {
      await request(app.getHttpServer())
        .post(`/api/menus/${menuSlug}/items`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'About', type: 'custom', url: '/about' })
        .expect(201)
    })

    it('PATCH /:slug/items/:id — update menu item', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/menus/${menuSlug}/items/${menuItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ label: 'Homepage', url: '/home' })
        .expect(200)

      expect(res.body.label).toBe('Homepage')
    })

    it('DELETE /:slug/items/:id — delete menu item', async () => {
      await request(app.getHttpServer())
        .delete(`/api/menus/${menuSlug}/items/${menuItemId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('DELETE /api/menus/:slug — delete menu', async () => {
      await request(app.getHttpServer())
        .delete(`/api/menus/${menuSlug}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })
  })

  // ─── Authorization Suite ──────────────────────────────────────

  describe('Authorization', () => {
    it('editor can create content', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Editor Content', typeSlug: 'post' })
        .expect(201)

      expect(res.body.title).toBe('Editor Content')
    })

    it('editor cannot create content types', async () => {
      await request(app.getHttpServer())
        .post('/api/content-types')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Blocked', slug: 'blocked' })
        .expect(403)
    })

    it('editor cannot delete content types', async () => {
      await request(app.getHttpServer())
        .delete('/api/content-types/post')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(403)
    })

    it('editor cannot create taxonomies', async () => {
      await request(app.getHttpServer())
        .post('/api/taxonomies')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Blocked', slug: 'blocked', type: 'flat' })
        .expect(403)
    })

    it('editor cannot create terms', async () => {
      await request(app.getHttpServer())
        .post('/api/taxonomies/category/terms')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Blocked', slug: 'blocked' })
        .expect(403)
    })

    it('editor cannot create menus', async () => {
      await request(app.getHttpServer())
        .post('/api/menus')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ name: 'Blocked', slug: 'blocked-menu' })
        .expect(403)
    })

    it('unauthenticated requests return 401', async () => {
      await request(app.getHttpServer())
        .post('/api/content-types')
        .send({ name: 'NoAuth', slug: 'noauth' })
        .expect(401)
    })

    it('public routes work without auth', async () => {
      await request(app.getHttpServer()).get('/api/taxonomies').expect(200)

      await request(app.getHttpServer()).get('/api/contents').expect(200)

      await request(app.getHttpServer()).get('/api/menus').expect(200)
    })

    it('invalid JWT returns 401', async () => {
      await request(app.getHttpServer())
        .get('/api/content-types')
        .set('Authorization', 'Bearer invalid-jwt-token')
        .expect(401)
    })
  })
})
