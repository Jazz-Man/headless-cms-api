import { INestApplication, Logger, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import cookieParser from 'cookie-parser'
import request from 'supertest'
import { AppModule } from '../src/app.module'
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter'

// Use test database for e2e
process.env.DB_DATABASE = 'headless_cms_test'

describe('AppController (e2e)', () => {
  let app: INestApplication

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
  }, 30_000)

  it('/api/taxonomies (GET) — public endpoint works', () => {
    return request(app.getHttpServer()).get('/api/taxonomies').expect(200)
  })

  afterAll(async () => {
    await app.close()
  })
})
