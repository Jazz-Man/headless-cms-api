import { extname } from 'node:path'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { v4 as uuidv4 } from 'uuid'
import { Media } from '../entities/media.entity'
import { UploadResponseDto } from './dto/upload-response.dto'
import type { IStorageProvider } from './storage/storage.interface'
import { STORAGE_PROVIDER } from './storage/storage.interface'

@Injectable()
export class MediaService {
  constructor(
    @InjectRepository(Media)
    private readonly repo: Repository<Media>,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: IStorageProvider,
  ) {}

  async upload(
    file: Buffer,
    originalName: string,
    mimeType: string,
    userId: string | undefined,
  ): Promise<UploadResponseDto> {
    const ext = extname(originalName)
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const filename = `${uuidv4()}${ext}`
    const key = `${year}/${month}/${day}/${filename}`

    await this.storage.upload(file, key, mimeType)

    const media = new Media()
    media.filename = filename
    media.originalName = originalName
    media.mimeType = mimeType
    media.sizeBytes = file.length
    media.path = key
    media.uploadedBy = userId ?? ''

    const saved = await this.repo.save(media)

    return {
      filename: saved.filename,
      id: saved.id,
      mimeType: saved.mimeType,
      originalName: saved.originalName,
      sizeBytes: saved.sizeBytes,
      url: this.storage.getUrl(saved.path),
    }
  }

  async findAll(
    page = 1,
    limit = 20,
  ): Promise<{ data: UploadResponseDto[]; total: number }> {
    const [items, total] = await this.repo.findAndCount({
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const data = items.map((item) => ({
      filename: item.filename,
      id: item.id,
      mimeType: item.mimeType,
      originalName: item.originalName,
      sizeBytes: item.sizeBytes,
      url: this.storage.getUrl(item.path),
    }))

    return { data, total }
  }

  async findOne(id: string): Promise<UploadResponseDto> {
    const media = await this.repo.findOne({ where: { id } })
    if (!media) {
      throw new NotFoundException(`Media "${id}" not found`)
    }

    return {
      filename: media.filename,
      id: media.id,
      mimeType: media.mimeType,
      originalName: media.originalName,
      sizeBytes: media.sizeBytes,
      url: this.storage.getUrl(media.path),
    }
  }

  async remove(id: string): Promise<void> {
    const media = await this.repo.findOne({ where: { id } })
    if (!media) {
      throw new NotFoundException(`Media "${id}" not found`)
    }

    await this.storage.delete(media.path)
    await this.repo.remove(media)
  }
}
