import { INestApplication, Logger, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import request from 'supertest'
import { DataSource } from 'typeorm'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'

process.env.DB_DATABASE = 'headless_cms_test'
process.env.THROTTLE_LIMIT = '200'
process.env.THROTTLE_TTL = '60000'

describe('Phase 2: Production Readiness (e2e)', () => {
  let app: INestApplication
  let dataSource: DataSource

  beforeAll(async () => {
    Logger.overrideLogger(false)

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile()

    app = moduleFixture.createNestApplication()

    app.use(helmet())

    app.enableCors({
      credentials: true,
      origin: true,
    })

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
    await dataSource.synchronize()
  }, 60_000)

  afterAll(async () => {
    if (app) {
      await app.close()
    }
  })

  // ─── Health Check Suite ──────────────────────────────────────

  describe('Health Check', () => {
    it('GET /api/health — returns 200 with status "ok"', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200)

      expect(res.body.status).toBe('ok')
    })

    it('GET /api/health — returns correct structure with database info', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200)

      expect(res.body).toHaveProperty('status')
      expect(res.body).toHaveProperty('info')
      expect(res.body.info).toHaveProperty('database')
      expect(res.body.info.database).toHaveProperty('status')
      expect(res.body.info.database.status).toBe('up')
    })
  })

  // ─── Security Headers Suite ──────────────────────────────────

  describe('Security Headers (Helmet)', () => {
    it('sets X-Frame-Options header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200)

      expect(res.headers['x-frame-options']).toBeDefined()
    })

    it('sets X-Content-Type-Options header to nosniff', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200)

      expect(res.headers['x-content-type-options']).toBe('nosniff')
    })

    it('sets Strict-Transport-Security header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200)

      expect(res.headers['strict-transport-security']).toBeDefined()
    })

    it('sets X-XSS-Protection header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200)

      expect(res.headers['x-xss-protection']).toBeDefined()
    })

    it('sets Referrer-Policy header', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .expect(200)

      expect(res.headers['referrer-policy']).toBeDefined()
    })
  })

  // ─── Rate Limiting Suite ─────────────────────────────────────

  describe('Rate Limiting (Throttler)', () => {
    it('includes rate limit headers on throttled endpoints', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/contents')
        .expect(200)

      expect(res.headers['x-ratelimit-limit']).toBeDefined()
      expect(res.headers['x-ratelimit-remaining']).toBeDefined()
      expect(res.headers['x-ratelimit-reset']).toBeDefined()
    })

    it('rate limit limit header is a positive number', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/contents')
        .expect(200)

      const limit = Number(res.headers['x-ratelimit-limit'])
      expect(limit).toBeGreaterThan(0)
    })

    it('rate limit remaining decreases after requests', async () => {
      const first = await request(app.getHttpServer())
        .get('/api/contents')
        .expect(200)

      const second = await request(app.getHttpServer())
        .get('/api/contents')
        .expect(200)

      const remaining1 = Number(first.headers['x-ratelimit-remaining'])
      const remaining2 = Number(second.headers['x-ratelimit-remaining'])
      expect(remaining2).toBeLessThanOrEqual(remaining1)
    })
  })

  // ─── CORS Suite ──────────────────────────────────────────────

  describe('CORS', () => {
    it('sets Access-Control-Allow-Origin when Origin header is sent', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      expect(res.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      )
    })

    it('sets Access-Control-Allow-Credentials to true', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/health')
        .set('Origin', 'http://localhost:3000')
        .expect(200)

      expect(res.headers['access-control-allow-credentials']).toBe('true')
    })

    it('handles preflight OPTIONS request', async () => {
      const res = await request(app.getHttpServer())
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .set('Access-Control-Request-Headers', 'Authorization')

      expect(res.status).toBeLessThan(500)
      expect(res.headers['access-control-allow-origin']).toBe(
        'http://localhost:3000',
      )
    })
  })
})
