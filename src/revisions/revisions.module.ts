import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Content } from '../entities/content.entity'
import { Revision } from '../entities/revision.entity'
import { RevisionsController } from './revisions.controller'
import { RevisionsService } from './revisions.service'

@Module({
  controllers: [RevisionsController],
  exports: [RevisionsService],
  imports: [TypeOrmModule.forFeature([Revision, Content])],
  providers: [RevisionsService],
})
export class RevisionsModule {}
