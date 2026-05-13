import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ContentTypesModule } from '../content-types/content-types.module'
import { Content } from '../entities/content.entity'
import { ContentTerm } from '../entities/content-term.entity'
import { RevisionsModule } from '../revisions/revisions.module'
import { SeoModule } from '../seo/seo.module'
import { WebhooksModule } from '../webhooks/webhooks.module'
import { ContentsController } from './contents.controller'
import { ContentsService } from './contents.service'

@Module({
  controllers: [ContentsController],
  exports: [ContentsService],
  imports: [
    TypeOrmModule.forFeature([Content, ContentTerm]),
    SeoModule,
    ContentTypesModule,
    forwardRef(() => RevisionsModule),
    forwardRef(() => WebhooksModule),
  ],
  providers: [ContentsService],
})
export class ContentsModule {}
