import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
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
import { User } from '../src/entities/user.entity'
import { seedPermissions } from './helpers/seed-permissions'

process.env.DB_DATABASE = 'headless_cms_test'

describe('Revisions (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let userRepo: Repository<User>
  let ctRepo: Repository<ContentType>

  let _adminToken: string
  let editorToken: string

  const adminEmail = 'admin-rev@example.com'
  const editorEmail = 'editor-rev@example.com'
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

    // Flush stale cache entries from previous test runs
    const cache = app.get<Cache>(CACHE_MANAGER)
    try {
      await cache.clear()
    } catch {
      // Clear may not be supported by all stores
    }

    userRepo = dataSource.getRepository(User)
    ctRepo = dataSource.getRepository(ContentType)

    await seedDatabase()

    // Login admin and editor
    const adminRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password })
      .expect(201)
    _adminToken = adminRes.body.accessToken

    const editorRes = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: editorEmail, password })
      .expect(201)
    editorToken = editorRes.body.accessToken
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
        displayName: 'Rev Admin',
        email: adminEmail,
        isActive: true,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'admin',
      }),
      userRepo.create({
        displayName: 'Rev Editor',
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

  describe('Content Revisions', () => {
    let contentId: string

    it('should create content without revisions', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({
          bodyJsonb: { blocks: [] },
          excerpt: 'Initial excerpt',
          slug: 'revision-test-post',
          title: 'Revision Test Post',
          typeSlug: 'post',
        })
        .expect(201)

      contentId = res.body.id
      expect(res.body.title).toBe('Revision Test Post')

      // No revisions yet
      const revRes = await request(app.getHttpServer())
        .get(`/api/contents/${contentId}/revisions`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)

      expect(revRes.body.total).toBe(0)
    })

    it('should auto-create revision on content update', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/contents/${contentId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Updated Title v1' })
        .expect(200)

      expect(res.body.title).toBe('Updated Title v1')

      // Verify revision was created
      const revRes = await request(app.getHttpServer())
        .get(`/api/contents/${contentId}/revisions`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)

      expect(revRes.body.total).toBe(1)
      expect(revRes.body.items[0].revisionNumber).toBe(1)
      expect(revRes.body.items[0].snapshot.title).toBe('Revision Test Post')
    })

    it('should create another revision on second update', async () => {
      await request(app.getHttpServer())
        .patch(`/api/contents/${contentId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Updated Title v2' })
        .expect(200)

      const revRes = await request(app.getHttpServer())
        .get(`/api/contents/${contentId}/revisions`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)

      expect(revRes.body.total).toBe(2)
      // Most recent first (DESC order)
      expect(revRes.body.items[0].revisionNumber).toBe(2)
      expect(revRes.body.items[0].snapshot.title).toBe('Updated Title v1')
      expect(revRes.body.items[1].revisionNumber).toBe(1)
      expect(revRes.body.items[1].snapshot.title).toBe('Revision Test Post')
    })

    it('should list revisions with pagination', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/contents/${contentId}/revisions?limit=1&page=1`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)

      expect(res.body.items.length).toBe(1)
      expect(res.body.total).toBe(2)
      expect(res.body.page).toBe(1)
      expect(res.body.limit).toBe(1)
    })

    it('should get a specific revision by number', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/contents/${contentId}/revisions/1`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)

      expect(res.body.revisionNumber).toBe(1)
      expect(res.body.snapshot.title).toBe('Revision Test Post')
      expect(res.body.snapshot.excerpt).toBe('Initial excerpt')
      expect(res.body.snapshot.slug).toBe('revision-test-post')
    })

    it('should return 404 for nonexistent revision', async () => {
      await request(app.getHttpServer())
        .get(`/api/contents/${contentId}/revisions/999`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(404)
    })

    it('should restore content from a revision', async () => {
      // Current title is "Updated Title v2", restore to revision 1
      const res = await request(app.getHttpServer())
        .post(`/api/contents/${contentId}/revisions/1/restore`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(201)

      // Title should be restored to revision 1's snapshot
      expect(res.body.title).toBe('Revision Test Post')
    })

    it('should create a pre-restore revision when restoring', async () => {
      // Restoring should have created a revision of the "Updated Title v2"
      // state before applying the restore
      const revRes = await request(app.getHttpServer())
        .get(`/api/contents/${contentId}/revisions`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)

      // 2 original + 1 pre-restore snapshot = 3
      expect(revRes.body.total).toBe(3)
      // Most recent is the pre-restore snapshot
      expect(revRes.body.items[0].revisionNumber).toBe(3)
      expect(revRes.body.items[0].snapshot.title).toBe('Updated Title v2')
    })

    it('should require auth to list revisions', async () => {
      await request(app.getHttpServer())
        .get(`/api/contents/${contentId}/revisions`)
        .expect(401)
    })

    it('should require auth to get a revision', async () => {
      await request(app.getHttpServer())
        .get(`/api/contents/${contentId}/revisions/1`)
        .expect(401)
    })

    it('should require auth to restore a revision', async () => {
      await request(app.getHttpServer())
        .post(`/api/contents/${contentId}/revisions/1/restore`)
        .expect(401)
    })

    it('should delete revisions when content is deleted', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/contents')
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'To Be Deleted', typeSlug: 'post' })
        .expect(201)

      const tempId = res.body.id

      await request(app.getHttpServer())
        .patch(`/api/contents/${tempId}`)
        .set('Authorization', `Bearer ${editorToken}`)
        .send({ title: 'Updated Before Delete' })
        .expect(200)

      const revBefore = await request(app.getHttpServer())
        .get(`/api/contents/${tempId}/revisions`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)
      expect(revBefore.body.total).toBe(1)

      // Delete content via raw repo since archive doesn't cascade
      const contentRepo = dataSource.getRepository(Content)
      await contentRepo.delete(tempId)

      // Revisions should be gone due to CASCADE
      const revAfter = await request(app.getHttpServer())
        .get(`/api/contents/${tempId}/revisions`)
        .set('Authorization', `Bearer ${editorToken}`)
        .expect(200)
      expect(revAfter.body.total).toBe(0)
    })
  })
})
