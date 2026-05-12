import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_GUARD } from '@nestjs/core'
import { TypeOrmModule } from '@nestjs/typeorm'
import { AuthModule } from './auth/auth.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { databaseConfig } from './config/database.config'
import { ContentTypesModule } from './content-types/content-types.module'
import { ContentsModule } from './contents/contents.module'
import { MediaModule } from './media/media.module'
import { MenusModule } from './menus/menus.module'
import { SeoModule } from './seo/seo.module'
import { TaxonomiesModule } from './taxonomies/taxonomies.module'

@Module({
  imports: [
    ConfigModule,
    TypeOrmModule.forRootAsync({
      useFactory: databaseConfig,
    }),
    AuthModule,
    ContentTypesModule,
    TaxonomiesModule,
    MediaModule,
    MenusModule,
    SeoModule,
    ContentsModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
