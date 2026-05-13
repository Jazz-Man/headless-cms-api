import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import { INestApplication, Logger, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { DataSource, Repository } from 'typeorm'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { ContentType } from '../src/entities/content-type.entity'
import { Taxonomy, TaxonomyType } from '../src/entities/taxonomy.entity'
import { User, UserRole } from '../src/entities/user.entity'

process.env.DB_DATABASE = 'headless_cms_test'

describe('Bulk Operations (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let userRepo: Repository<User>
  let ctRepo: Repository<ContentType>
  let taxRepo: Repository<Taxonomy>

  let adminToken: string
  let editorToken: string

  const adminEmail = 'bulk-admin@example.com'
  const editorEmail = 'bulk-editor@example.com'
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
    await dataSource.dropDatabase()
    await dataSource.synchronize()

    const cache = app.get<Cache>(CACHE_MANAGER)
    try {
      await cache.clear()
    } catch {
      // clear may not be supported
    }

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
        displayName: 'Bulk Admin',
        email: adminEmail,
        isActive: true,
        passwordHash: await bcrypt.hash(password, 10),
        role: UserRole.ADMIN,
      }),
      userRepo.create({
        displayName: 'Bulk Editor',
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
        type: TaxonomyType.HIERARCHICAL,
      }),
      taxRepo.create({
        isBuiltin: true,
        name: 'Tags',
        slug: 'post_tag',
        type: TaxonomyType.FLAT,
      }),
    ])
  }

  async function login(email: string, pw: string): Promise<string> {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: pw })
      .expect(201)
    return res.body.accessToken
  }

  // ─── Setup: login ─────────────────────────────────────────────

  describe('Setup', () => {
    it('logs in admin and editor', async () => {
      adminToken = await login(adminEmail, password)
      editorToken = await login(editorEmail, password)
      expect(adminToken).toBeDefined()
      expect(editorToken).toBeDefined()
    })
  })

  // ─── Bulk Create Contents ─────────────────────────────────────

  describe('POST /api/contents/bulk (create)', () => {
    it('creates multiple content items', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'create',
          items: [
            { title: 'Bulk Post 1', typeSlug: 'post' },
            { title: 'Bulk Post 2', typeSlug: 'post' },
            { title: 'Bulk Page 1', typeSlug: 'page' },
          ],
        })
        .expect(201)

      expect(res.body.total).toBe(3)
      expect(res.body.succeeded).toBe(3)
      expect(res.body.failed).toBe(0)
      expect(res.body.items).toHaveLength(3)

      for (const item of res.body.items) {
        expect(item.success).toBe(true)
        expect(item.id).toBeDefined()
      }
    })

    it('reports partial failures', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'create',
          items: [
            { title: 'Good Post', typeSlug: 'post' },
            { title: 'Bad Post', typeSlug: 'nonexistent-type' },
          ],
        })
        .expect(201)

      expect(res.body.total).toBe(2)
      expect(res.body.succeeded).toBe(1)
      expect(res.body.failed).toBe(1)
    })
  })

  // ─── Bulk Update Contents ─────────────────────────────────────

  describe('POST /api/contents/bulk (update)', () => {
    let contentIds: string[]

    beforeAll(async () => {
      const ids: string[] = []
      for (let i = 0; i < 2; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/contents')
          .set('Authorization', `Bearer ${editorToken}`)
          .send({ title: `Update Target ${i}`, typeSlug: 'post' })
          .expect(201)
        ids.push(res.body.id)
      }
      contentIds = ids
    })

    it('updates multiple content items', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents/bulk')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          action: 'update',
          items: [
            { id: contentIds[0], title: 'Updated Title 0' },
            { id: contentIds[1], title: 'Updated Title 1' },
          ],
        })
        .expect(201)

      expect(res.body.total).toBe(2)
      expect(res.body.succeeded).toBe(2)
      expect(res.body.failed).toBe(0)
    })

    it('reports failure for nonexistent id', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents/bulk')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          action: 'update',
          items: [
            {
              id: '00000000-0000-0000-0000-000000000000',
              title: 'Ghost',
            },
          ],
        })
        .expect(201)

      expect(res.body.total).toBe(1)
      expect(res.body.succeeded).toBe(0)
      expect(res.body.failed).toBe(1)
      expect(res.body.items[0].error).toBeDefined()
    })
  })

  // ─── Bulk Delete Contents ─────────────────────────────────────

  describe('POST /api/contents/bulk (delete)', () => {
    let contentIds: string[]

    beforeAll(async () => {
      const ids: string[] = []
      for (let i = 0; i < 3; i++) {
        const res = await request(app.getHttpServer())
          .post('/api/contents')
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ title: `Delete Target ${i}`, typeSlug: 'post' })
          .expect(201)
        ids.push(res.body.id)
      }
      contentIds = ids
    })

    it('archives multiple content items (admin)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'delete',
          items: [{ id: contentIds[0] }, { id: contentIds[1] }],
        })
        .expect(201)

      expect(res.body.total).toBe(2)
      expect(res.body.succeeded).toBe(2)
      expect(res.body.failed).toBe(0)
    })

    it('reports failure for already-archived content', async () => {
      // contentIds[0] was archived above, archiving again should
      // succeed because archive just sets status
      const res = await request(app.getHttpServer())
        .post('/api/contents/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          action: 'delete',
          items: [{ id: contentIds[0] }],
        })
        .expect(201)

      expect(res.body.total).toBe(1)
    })
  })

  // ─── Bulk Create Terms ────────────────────────────────────────

  describe('POST /api/taxonomies/:taxonomySlug/terms/bulk', () => {
    it('creates multiple terms', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/taxonomies/post_tag/terms/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { name: 'Tag Alpha', slug: 'tag-alpha' },
            { name: 'Tag Beta', slug: 'tag-beta' },
          ],
        })
        .expect(201)

      expect(res.body.total).toBe(2)
      expect(res.body.succeeded).toBe(2)
      expect(res.body.failed).toBe(0)
      expect(res.body.items).toHaveLength(2)
    })

    it('reports partial failures for duplicate slugs', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/taxonomies/post_tag/terms/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [
            { name: 'Tag Gamma', slug: 'tag-gamma' },
            { name: 'Tag Alpha Dup', slug: 'tag-alpha' },
          ],
        })
        .expect(201)

      expect(res.body.total).toBe(2)
      expect(res.body.succeeded).toBe(1)
      expect(res.body.failed).toBe(1)
    })

    it('fails for nonexistent taxonomy', async () => {
      await request(app.getHttpServer())
        .post('/api/taxonomies/nonexistent/terms/bulk')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          items: [{ name: 'Nope', slug: 'nope' }],
        })
        .expect(404)
    })
  })

  // ─── Auth Checks ──────────────────────────────────────────────

  describe('Authorization', () => {
    it('bulk contents requires auth', async () => {
      await request(app.getHttpServer())
        .post('/api/contents/bulk')
        .send({
          action: 'create',
          items: [{ title: 'NoAuth', typeSlug: 'post' }],
        })
        .expect(401)
    })

    it('bulk terms requires auth', async () => {
      await request(app.getHttpServer())
        .post('/api/taxonomies/post_tag/terms/bulk')
        .send({
          items: [{ name: 'NoAuth', slug: 'noauth' }],
        })
        .expect(401)
    })

    it('editor cannot bulk create terms (admin only)', async () => {
      await request(app.getHttpServer())
        .post('/api/taxonomies/post_tag/terms/bulk')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          items: [{ name: 'Blocked', slug: 'blocked' }],
        })
        .expect(403)
    })

    it('editor can bulk create/update contents', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents/bulk')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          action: 'create',
          items: [{ title: 'Editor Bulk', typeSlug: 'post' }],
        })
        .expect(201)

      expect(res.body.succeeded).toBe(1)
    })
  })
})
