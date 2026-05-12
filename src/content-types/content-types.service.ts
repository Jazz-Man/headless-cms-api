import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContentType } from '../entities/content-type.entity'
import { CreateContentTypeDto } from './dto/create-content-type.dto'
import { UpdateContentTypeDto } from './dto/update-content-type.dto'

const LIST_CACHE_KEY = 'content-types:list'

@Injectable()
export class ContentTypesService {
  constructor(
    @InjectRepository(ContentType)
    private readonly repo: Repository<ContentType>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(dto: CreateContentTypeDto): Promise<ContentType> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } })
    if (existing) {
      throw new ConflictException(
        `Content type with slug "${dto.slug}" already exists`,
      )
    }

    const contentType = this.repo.create(dto)
    const saved = await this.repo.save(contentType)
    await this.cacheManager.del(LIST_CACHE_KEY)
    return saved
  }

  async findAll(): Promise<ContentType[]> {
    const cached = await this.cacheManager.get<ContentType[]>(LIST_CACHE_KEY)
    if (cached) return cached

    const result = await this.repo.find({ order: { createdAt: 'DESC' } })
    await this.cacheManager.set(LIST_CACHE_KEY, result)
    return result
  }

  async findOne(slug: string): Promise<ContentType> {
    const cacheKey = `content-types:slug:${slug}`
    const cached = await this.cacheManager.get<ContentType>(cacheKey)
    if (cached) return cached

    const contentType = await this.repo.findOne({ where: { slug } })
    if (!contentType) {
      throw new NotFoundException(`Content type with slug "${slug}" not found`)
    }
    await this.cacheManager.set(cacheKey, contentType)
    return contentType
  }

  async update(slug: string, dto: UpdateContentTypeDto): Promise<ContentType> {
    const contentType = await this.findOne(slug)
    Object.assign(contentType, dto)
    const saved = await this.repo.save(contentType)
    await this.cacheManager.del(`content-types:slug:${slug}`)
    await this.cacheManager.del(LIST_CACHE_KEY)
    return saved
  }

  async remove(slug: string): Promise<void> {
    const contentType = await this.findOne(slug)
    await this.repo.remove(contentType)
    await this.cacheManager.del(`content-types:slug:${slug}`)
    await this.cacheManager.del(LIST_CACHE_KEY)
  }
}
