import { Module } from '@nestjs/common'
import { ContentsModule } from '../contents/contents.module'
import { TaxonomiesModule } from '../taxonomies/taxonomies.module'
import { TermsModule } from '../taxonomies/terms/terms.module'
import { BulkController } from './bulk.controller'
import { BulkService } from './bulk.service'

@Module({
  controllers: [BulkController],
  exports: [BulkService],
  imports: [ContentsModule, TaxonomiesModule, TermsModule],
  providers: [BulkService],
})
export class BulkModule {}
