import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Taxonomy } from '../entities/taxonomy.entity'
import { TaxonomiesController } from './taxonomies.controller'
import { TaxonomiesService } from './taxonomies.service'
import { TermsModule } from './terms/terms.module'

@Module({
  controllers: [TaxonomiesController],
  exports: [TaxonomiesService],
  imports: [
    TypeOrmModule.forFeature([Taxonomy]),
    forwardRef(() => TermsModule),
  ],
  providers: [TaxonomiesService],
})
export class TaxonomiesModule {}
