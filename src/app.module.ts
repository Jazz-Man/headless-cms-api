import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler'
import { TypeOrmModule } from '@nestjs/typeorm'
import { LoggerModule } from 'nestjs-pino'
import { AuthModule } from './auth/auth.module'
import { BulkModule } from './bulk/bulk.module'
import { CacheModule } from './cache/cache.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { PermissionsGuard } from './common/guards/permissions.guard'
import { databaseConfig } from './config/database.config'
import { ContentTypesModule } from './content-types/content-types.module'
import { ContentsModule } from './contents/contents.module'
import { HealthModule } from './health/health.module'
import { MediaModule } from './media/media.module'
import { MenusModule } from './menus/menus.module'
import { RevisionsModule } from './revisions/revisions.module'
import { RolesModule } from './roles/roles.module'
import { SeoModule } from './seo/seo.module'
import { SitemapModule } from './sitemap/sitemap.module'
import { TaxonomiesModule } from './taxonomies/taxonomies.module'
import { WebhooksModule } from './webhooks/webhooks.module'

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
    BulkModule,
    ContentTypesModule,
    HealthModule,
    TaxonomiesModule,
    MediaModule,
    MenusModule,
    RolesModule,
    SeoModule,
    SitemapModule,
    ContentsModule,
    RevisionsModule,
    WebhooksModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
  ],
})
export class AppModule {}
