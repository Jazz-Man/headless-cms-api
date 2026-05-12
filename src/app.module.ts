import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LoggerModule } from 'nestjs-pino'
import { AuthModule } from './auth/auth.module'
import { CacheModule } from './cache/cache.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { databaseConfig } from './config/database.config'
import { ContentTypesModule } from './content-types/content-types.module'
import { ContentsModule } from './contents/contents.module'
import { HealthModule } from './health/health.module'
import { MediaModule } from './media/media.module'
import { MenusModule } from './menus/menus.module'
import { SeoModule } from './seo/seo.module'
import { TaxonomiesModule } from './taxonomies/taxonomies.module'

@Module({
  imports: [
    LoggerModule.forRoot({
      pinoHttp: {
        level: process.env.LOG_LEVEL ?? 'info',
        redact: ['req.headers.authorization'],
        transport:
          process.env.NODE_ENV !== 'production'
            ? { options: { colorize: true }, target: 'pino-pretty' }
            : undefined,
      },
    }),
    ConfigModule,
    CacheModule,
    ThrottlerModule.forRoot([
      {
        limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
        ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
      },
    ]),
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    AuthModule,
    ContentTypesModule,
    HealthModule,
    TaxonomiesModule,
    MediaModule,
    MenusModule,
    SeoModule,
    ContentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
