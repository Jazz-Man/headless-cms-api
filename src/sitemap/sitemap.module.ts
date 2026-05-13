import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Content } from '../entities/content.entity'
import { Taxonomy } from '../entities/taxonomy.entity'
import { Term } from '../entities/term.entity'
import { SitemapController } from './sitemap.controller'
import { SitemapService } from './sitemap.service'

@Module({
  controllers: [SitemapController],
  imports: [TypeOrmModule.forFeature([Content, Taxonomy, Term])],
  providers: [SitemapService],
})
export class SitemapModule {}
