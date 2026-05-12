import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ContentTypesModule } from '../content-types/content-types.module'
import { Content } from '../entities/content.entity'
import { ContentTerm } from '../entities/content-term.entity'
import { SeoModule } from '../seo/seo.module'
import { ContentsController } from './contents.controller'
import { ContentsService } from './contents.service'

@Module({
  controllers: [ContentsController],
  exports: [ContentsService],
  imports: [
    TypeOrmModule.forFeature([Content, ContentTerm]),
    SeoModule,
    ContentTypesModule,
  ],
  providers: [ContentsService],
})
export class ContentsModule {}
