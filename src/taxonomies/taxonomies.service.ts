import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Taxonomy } from '../entities/taxonomy.entity'
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto'
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto'

const LIST_CACHE_KEY = 'taxonomies:list'

@Injectable()
export class TaxonomiesService {
  constructor(
    @InjectRepository(Taxonomy)
    private readonly repo: Repository<Taxonomy>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(dto: CreateTaxonomyDto): Promise<Taxonomy> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } })
    if (existing) {
      throw new ConflictException(
        `Taxonomy with slug "${dto.slug}" already exists`,
      )
    }

    const taxonomy = this.repo.create(dto)
    const saved = await this.repo.save(taxonomy)
    await this.cacheManager.del(LIST_CACHE_KEY)
    return saved
  }

  async findAll(): Promise<Taxonomy[]> {
    const cached = await this.cacheManager.get<Taxonomy[]>(LIST_CACHE_KEY)
    if (cached) return cached

    const result = await this.repo.find({ order: { name: 'ASC' } })
    await this.cacheManager.set(LIST_CACHE_KEY, result)
    return result
  }

  async findOne(slug: string): Promise<Taxonomy> {
    const cacheKey = `taxonomies:slug:${slug}`
    const cached = await this.cacheManager.get<Taxonomy>(cacheKey)
    if (cached) return cached

    const taxonomy = await this.repo.findOne({ where: { slug } })
    if (!taxonomy) {
      throw new NotFoundException(`Taxonomy "${slug}" not found`)
    }
    await this.cacheManager.set(cacheKey, taxonomy)
    return taxonomy
  }

  async update(slug: string, dto: UpdateTaxonomyDto): Promise<Taxonomy> {
    const taxonomy = await this.findOne(slug)
    Object.assign(taxonomy, dto)
    const saved = await this.repo.save(taxonomy)
    await this.cacheManager.del(`taxonomies:slug:${slug}`)
    await this.cacheManager.del(LIST_CACHE_KEY)
    return saved
  }

  async remove(slug: string): Promise<void> {
    const taxonomy = await this.findOne(slug)
    await this.repo.remove(taxonomy)
    await this.cacheManager.del(`taxonomies:slug:${slug}`)
    await this.cacheManager.del(LIST_CACHE_KEY)
  }
}
