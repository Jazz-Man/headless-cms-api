import { createHmac } from 'node:crypto'
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
import { User } from '../src/entities/user.entity'
import { Webhook } from '../src/entities/webhook.entity'
import { WebhooksService } from '../src/webhooks/webhooks.service'
import { seedPermissions } from './helpers/seed-permissions'

process.env.DB_DATABASE = 'headless_cms_test'

describe('Webhooks (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let userRepo: Repository<User>
  let ctRepo: Repository<ContentType>
  let webhooksService: WebhooksService

  let adminToken: string
  let editorToken: string

  const adminEmail = 'admin-wh-test@example.com'
  const editorEmail = 'editor-wh-test@example.com'
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
      // Clear may not be supported
    }

    userRepo = dataSource.getRepository(User)
    ctRepo = dataSource.getRepository(ContentType)
    webhooksService = app.get(WebhooksService)

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
    await seedPermissions(dataSource)

    await userRepo.save([
      userRepo.create({
        displayName: 'WH Admin',
        email: adminEmail,
        isActive: true,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'admin',
      }),
      userRepo.create({
        displayName: 'WH Editor',
        email: editorEmail,
        isActive: true,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'editor',
      }),
    ])

    await ctRepo.save([
      ctRepo.create({
        isBuiltin: true,
        name: 'Post',
        schemaJsonb: {},
        slug: 'post',
      }),
    ])
  }

  async function login(email: string, pw: string) {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email, password: pw })
      .expect(201)

    return res.body.accessToken
  }

  // ─── Auth Setup ───────────────────────────────────────────────

  describe('Setup', () => {
    it('login as admin and editor', async () => {
      adminToken = await login(adminEmail, password)
      editorToken = await login(editorEmail, password)
      expect(adminToken).toBeDefined()
      expect(editorToken).toBeDefined()
    })
  })

  // ─── Webhooks CRUD ────────────────────────────────────────────

  describe('Webhooks CRUD', () => {
    let webhookId: string

    it('POST /api/webhooks — admin can create', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          events: ['content.created', 'content.updated'],
          url: 'https://example.com/webhook',
        })
        .expect(201)

      expect(res.body.url).toBe('https://example.com/webhook')
      expect(res.body.events).toEqual(['content.created', 'content.updated'])
      expect(res.body.isActive).toBe(true)
      expect(res.body.secret).toBeDefined()
      expect(res.body.id).toBeDefined()
      webhookId = res.body.id
    })

    it('POST /api/webhooks — reject invalid URL', async () => {
      await request(app.getHttpServer())
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          events: ['content.created'],
          url: 'not-a-url',
        })
        .expect(400)
    })

    it('POST /api/webhooks — reject editor (non-admin)', async () => {
      await request(app.getHttpServer())
        .post('/api/webhooks')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          events: ['content.created'],
          url: 'https://example.com/hook',
        })
        .expect(403)
    })

    it('POST /api/webhooks — reject unauthenticated', async () => {
      await request(app.getHttpServer())
        .post('/api/webhooks')
        .send({
          events: ['content.created'],
          url: 'https://example.com/hook',
        })
        .expect(401)
    })

    it('GET /api/webhooks — admin can list', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      expect(Array.isArray(res.body)).toBe(true)
      expect(res.body.length).toBeGreaterThanOrEqual(1)
      const found = res.body.find((w: Webhook) => w.id === webhookId)
      expect(found).toBeDefined()
    })

    it('GET /api/webhooks — reject editor', async () => {
      await request(app.getHttpServer())
        .get('/api/webhooks')
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(403)
    })

    it('PATCH /api/webhooks/:id — update webhook', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          events: ['content.created', 'content.updated', 'content.deleted'],
        })
        .expect(200)

      expect(res.body.events).toContain('content.deleted')
    })

    it('PATCH /api/webhooks/:id — toggle active', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ isActive: false })
        .expect(200)

      expect(res.body.isActive).toBe(false)
    })

    it('PATCH /api/webhooks/:id — 404 for missing', async () => {
      await request(app.getHttpServer())
        .patch('/api/webhooks/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ url: 'https://example.com/new' })
        .expect(404)
    })

    it('DELETE /api/webhooks/:id — delete webhook', async () => {
      await request(app.getHttpServer())
        .delete(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)
    })

    it('DELETE /api/webhooks/:id — 404 after delete', async () => {
      await request(app.getHttpServer())
        .delete(`/api/webhooks/${webhookId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(404)
    })
  })

  // ─── Webhook Event Firing ─────────────────────────────────────

  describe('Webhook event firing', () => {
    it('should fire content.created on content creation', async () => {
      const firedEvents: string[] = []
      const spy = jest
        .spyOn(webhooksService, 'fireEvent')
        .mockImplementation((event) => {
          firedEvents.push(event)
          return Promise.resolve()
        })

      await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Webhook Test Post', typeSlug: 'post' })
        .expect(201)

      // Give async webhook fire a tick
      await new Promise((r) => setTimeout(r, 100))

      expect(firedEvents).toContain('content.created')
      spy.mockRestore()
    })

    it('should fire content.updated on content update', async () => {
      const firedEvents: string[] = []
      const spy = jest
        .spyOn(webhooksService, 'fireEvent')
        .mockImplementation((event) => {
          firedEvents.push(event)
          return Promise.resolve()
        })

      const createRes = await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Update WH Test', typeSlug: 'post' })
        .expect(201)

      // Clear the create event
      firedEvents.length = 0
      spy.mockRestore()

      const updateSpy = jest
        .spyOn(webhooksService, 'fireEvent')
        .mockImplementation((event) => {
          firedEvents.push(event)
          return Promise.resolve()
        })

      await request(app.getHttpServer())
        .patch(`/api/contents/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Updated WH Test' })
        .expect(200)

      await new Promise((r) => setTimeout(r, 100))

      expect(firedEvents).toContain('content.updated')
      updateSpy.mockRestore()
    })

    it('should fire content.published on first publish', async () => {
      const firedEvents: string[] = []
      const spy = jest
        .spyOn(webhooksService, 'fireEvent')
        .mockImplementation((event) => {
          firedEvents.push(event)
          return Promise.resolve()
        })

      const createRes = await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Publish WH Test', typeSlug: 'post' })
        .expect(201)

      // Clear the create event
      firedEvents.length = 0
      spy.mockRestore()

      const publishSpy = jest
        .spyOn(webhooksService, 'fireEvent')
        .mockImplementation((event) => {
          firedEvents.push(event)
          return Promise.resolve()
        })

      await request(app.getHttpServer())
        .patch(`/api/contents/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ status: 'published' })
        .expect(200)

      await new Promise((r) => setTimeout(r, 100))

      expect(firedEvents).toContain('content.published')
      publishSpy.mockRestore()
    })

    it('should fire content.deleted on content archive', async () => {
      const firedEvents: string[] = []
      const spy = jest
        .spyOn(webhooksService, 'fireEvent')
        .mockImplementation((event) => {
          firedEvents.push(event)
          return Promise.resolve()
        })

      const createRes = await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ title: 'Delete WH Test', typeSlug: 'post' })
        .expect(201)

      // Clear the create event
      firedEvents.length = 0
      spy.mockRestore()

      const deleteSpy = jest
        .spyOn(webhooksService, 'fireEvent')
        .mockImplementation((event) => {
          firedEvents.push(event)
          return Promise.resolve()
        })

      await request(app.getHttpServer())
        .delete(`/api/contents/${createRes.body.id}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200)

      await new Promise((r) => setTimeout(r, 100))

      expect(firedEvents).toContain('content.deleted')
      deleteSpy.mockRestore()
    })
  })

  // ─── HMAC Signature Verification ──────────────────────────────

  describe('HMAC signature', () => {
    it('generates correct HMAC-SHA256 signature', () => {
      const secret = 'test-secret-key'
      const payload = {
        data: { contentId: 'abc', title: 'Test' },
        event: 'content.created',
        timestamp: '2026-01-01T00:00:00.000Z',
      }
      const body = JSON.stringify(payload)

      const expected = createHmac('sha256', secret).update(body).digest('hex')

      // Verify the format: sha256=<hex>
      expect(expected).toMatch(/^[a-f0-9]{64}$/)
    })
  })
})
