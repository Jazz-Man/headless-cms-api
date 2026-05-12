import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContentType } from '../entities/content-type.entity'
import { CreateContentTypeDto } from './dto/create-content-type.dto'
import { UpdateContentTypeDto } from './dto/update-content-type.dto'

@Injectable()
export class ContentTypesService {
  constructor(
    @InjectRepository(ContentType)
    private readonly repo: Repository<ContentType>,
  ) {}

  async create(dto: CreateContentTypeDto): Promise<ContentType> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } })
    if (existing) {
      throw new ConflictException(
        `Content type with slug "${dto.slug}" already exists`,
      )
    }

    const contentType = this.repo.create(dto)
    return this.repo.save(contentType)
  }

  findAll(): Promise<ContentType[]> {
    return this.repo.find({ order: { createdAt: 'DESC' } })
  }

  async findOne(slug: string): Promise<ContentType> {
    const contentType = await this.repo.findOne({ where: { slug } })
    if (!contentType) {
      throw new NotFoundException(`Content type with slug "${slug}" not found`)
    }
    return contentType
  }

  async update(slug: string, dto: UpdateContentTypeDto): Promise<ContentType> {
    const contentType = await this.findOne(slug)
    Object.assign(contentType, dto)
    return this.repo.save(contentType)
  }

  async remove(slug: string): Promise<void> {
    const contentType = await this.findOne(slug)
    await this.repo.remove(contentType)
  }
}
