import { Logger, ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import * as express from 'express'
import helmet from 'helmet'
import * as path from 'path'
import { AppModule } from './app.module'
import { HttpExceptionFilter } from './common/filters/http-exception.filter'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  })
  app.useLogger(app.get(Logger))

  app.use(helmet())

  app.enableCors({
    credentials: true,
    origin: process.env.CORS_ORIGINS?.split(',') || '*',
  })

  app.setGlobalPrefix('api')

  app.use(cookieParser())
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      transform: true,
      whitelist: true,
    }),
  )
  app.useGlobalFilters(new HttpExceptionFilter())

  app.enableShutdownHooks()

  const port = process.env.PORT ?? 3000
  await app.listen(port)
}
bootstrap()
