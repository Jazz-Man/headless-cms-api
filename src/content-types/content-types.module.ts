import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { ContentType } from '../entities/content-type.entity'
import { ContentTypesController } from './content-types.controller'
import { ContentTypesService } from './content-types.service'

@Module({
  controllers: [ContentTypesController],
  exports: [ContentTypesService],
  imports: [TypeOrmModule.forFeature([ContentType])],
  providers: [ContentTypesService],
})
export class ContentTypesModule {}
