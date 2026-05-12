import { Module } from '@nestjs/common'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Media } from '../entities/media.entity'
import { MediaController } from './media.controller'
import { MediaService } from './media.service'
import { LocalStorageProvider } from './storage/local.storage'
import { STORAGE_PROVIDER } from './storage/storage.interface'

@Module({
  controllers: [MediaController],
  exports: [MediaService],
  imports: [TypeOrmModule.forFeature([Media])],
  providers: [
    MediaService,
    { provide: STORAGE_PROVIDER, useClass: LocalStorageProvider },
  ],
})
export class MediaModule {}
