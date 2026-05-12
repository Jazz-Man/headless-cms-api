import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { SeoMeta } from '../entities/seo-meta.entity'
import { SeoService } from './seo.service'

@Module({
  exports: [SeoService],
  imports: [TypeOrmModule.forFeature([SeoMeta])],
  providers: [SeoService],
})
export class SeoModule {}
