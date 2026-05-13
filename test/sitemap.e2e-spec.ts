import { INestApplication, Logger, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as bcrypt from 'bcrypt'
import request from 'supertest'
import { DataSource, Repository } from 'typeorm'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'
import { Content, ContentStatus } from '../src/entities/content.entity'
import { ContentType } from '../src/entities/content-type.entity'
import { Taxonomy, TaxonomyType } from '../src/entities/taxonomy.entity'
import { Term } from '../src/entities/term.entity'
import { User } from '../src/entities/user.entity'
import { seedPermissions } from './helpers/seed-permissions'

process.env.DB_DATABASE = 'headless_cms_test'

describe('Sitemap (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource
  let userRepo: Repository<User>
  let ctRepo: Repository<ContentType>
  let taxRepo: Repository<Taxonomy>
  let termRepo: Repository<Term>
  let contentRepo: Repository<Content>

  let _adminToken: string
  let contentTypeId: string

  const adminEmail = 'sitemap-admin@example.com'
  const password = 'password123'

  beforeAll(async () => {
    Logger.overrideLogger(false)

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    app.setGlobalPrefix('api')
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

    userRepo = dataSource.getRepository(User)
    ctRepo = dataSource.getRepository(ContentType)
    taxRepo = dataSource.getRepository(Taxonomy)
    termRepo = dataSource.getRepository(Term)
    contentRepo = dataSource.getRepository(Content)

    await seedDatabase()
    await login()
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

    await userRepo.save(
      userRepo.create({
        displayName: 'Sitemap Admin',
        email: adminEmail,
        isActive: true,
        passwordHash: await bcrypt.hash(password, 10),
        role: 'admin',
      }),
    )

    const ct = await ctRepo.save(
      ctRepo.create({
        isBuiltin: true,
        name: 'Post',
        schemaJsonb: {},
        slug: 'post',
      }),
    )
    contentTypeId = ct.id

    await taxRepo.save(
      taxRepo.create({
        isBuiltin: true,
        name: 'Categories',
        slug: 'category',
        type: TaxonomyType.HIERARCHICAL,
      }),
    )

    const taxonomy = await taxRepo.findOneByOrFail({ slug: 'category' })

    await termRepo.save(
      termRepo.create({
        name: 'Technology',
        slug: 'technology',
        taxonomyId: taxonomy.id,
      }),
    )
  }

  async function login() {
    const res = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ email: adminEmail, password })
      .expect(201)

    _adminToken = res.body.accessToken
  }

  async function createPublishedContent(slug: string) {
    const content = contentRepo.create({
      authorId: (await userRepo.findOne({ where: { email: adminEmail } }))!.id,
      slug,
      status: ContentStatus.PUBLISHED,
      title: `Post ${slug}`,
      typeId: contentTypeId,
    })
    content.publishedAt = new Date()
    await contentRepo.save(content)
  }

  it('GET /api/sitemap.xml returns 200', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sitemap.xml')
      .expect(200)

    expect(res.text).toBeDefined()
  })

  it('response Content-Type is application/xml', async () => {
    await request(app.getHttpServer())
      .get('/api/sitemap.xml')
      .expect('Content-Type', /application\/xml/)
  })

  it('response contains valid XML sitemap structure', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sitemap.xml')
      .expect(200)

    expect(res.text).toContain('<?xml version="1.0" encoding="UTF-8"?>')
    expect(res.text).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    )
    expect(res.text).toContain('</urlset>')
    expect(res.text).toContain('<url>')
    expect(res.text).toContain('<loc>')
    expect(res.text).toContain('<lastmod>')
    expect(res.text).toContain('<changefreq>')
    expect(res.text).toContain('<priority>')
  })

  it('includes term URLs with monthly changefreq', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/sitemap.xml')
      .expect(200)

    expect(res.text).toContain('/category/technology')
    expect(res.text).toContain('<changefreq>monthly</changefreq>')
    expect(res.text).toContain('<priority>0.5</priority>')
  })

  it('includes published content URLs with weekly changefreq', async () => {
    await createPublishedContent('sitemap-test-post')

    const res = await request(app.getHttpServer())
      .get('/api/sitemap.xml')
      .expect(200)

    expect(res.text).toContain('/post/sitemap-test-post')
    expect(res.text).toContain('<changefreq>weekly</changefreq>')
    expect(res.text).toContain('<priority>0.8</priority>')
  })

  it('does not include draft content', async () => {
    const content = contentRepo.create({
      authorId: (await userRepo.findOne({ where: { email: adminEmail } }))!.id,
      slug: 'draft-should-not-appear',
      status: ContentStatus.DRAFT,
      title: 'Draft Post',
      typeId: contentTypeId,
    })
    await contentRepo.save(content)

    const res = await request(app.getHttpServer())
      .get('/api/sitemap.xml')
      .expect(200)

    expect(res.text).not.toContain('draft-should-not-appear')
  })
})
