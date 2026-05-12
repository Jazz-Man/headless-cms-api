import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { TypeOrmModule } from '@nestjs/typeorm'
import { Media } from '../entities/media.entity'
import { MediaController } from './media.controller'
import { MediaService } from './media.service'
import { LocalStorageProvider } from './storage/local.storage'
import { S3StorageProvider } from './storage/s3.storage'
import { STORAGE_PROVIDER } from './storage/storage.interface'

@Module({
  controllers: [MediaController],
  exports: [MediaService],
  imports: [ConfigModule, TypeOrmModule.forFeature([Media])],
  providers: [
    MediaService,
    {
      inject: [ConfigService],
      provide: STORAGE_PROVIDER,
      useFactory: (configService: ConfigService) => {
        const driver = configService.get<string>('STORAGE_DRIVER', 'local')
        if (driver === 's3') {
          return new S3StorageProvider(configService)
        }
        return new LocalStorageProvider(configService)
      },
    },
  ],
})
export class MediaModule {}
