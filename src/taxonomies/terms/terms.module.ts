import { forwardRef, Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Term } from '../../entities/term.entity'
import { TaxonomiesModule } from '../taxonomies.module'
import { TermsController } from './terms.controller'
import { TermsService } from './terms.service'

@Module({
  controllers: [TermsController],
  exports: [TermsService],
  imports: [
    TypeOrmModule.forFeature([Term]),
    forwardRef(() => TaxonomiesModule),
  ],
  providers: [TermsService],
})
export class TermsModule {}
