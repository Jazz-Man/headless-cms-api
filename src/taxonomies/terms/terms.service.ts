import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository, TreeRepository } from 'typeorm'
import { Term } from '../../entities/term.entity'
import { CreateTermDto } from './dto/create-term.dto'
import { UpdateTermDto } from './dto/update-term.dto'

@Injectable()
export class TermsService {
  constructor(
    @InjectRepository(Term)
    private readonly repo: TreeRepository<Term>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(taxonomyId: string, dto: CreateTermDto): Promise<Term> {
    const existing = await this.repo.findOne({
      where: { slug: dto.slug, taxonomyId },
    })
    if (existing) {
      throw new ConflictException(
        `Term with slug "${dto.slug}" already exists in this taxonomy`,
      )
    }

    const term = this.repo.create({ ...dto, taxonomyId })
    const saved = await this.repo.save(term)
    await this.invalidateTermsCache(taxonomyId)
    return saved
  }

  async findFlat(taxonomyId: string): Promise<Term[]> {
    const cacheKey = `terms:flat:${taxonomyId}`
    const cached = await this.cacheManager.get<Term[]>(cacheKey)
    if (cached) return cached

    const result = await this.repo.find({
      order: { name: 'ASC', sortOrder: 'ASC' },
      where: { taxonomyId },
    })
    await this.cacheManager.set(cacheKey, result)
    return result
  }

  async findTree(taxonomyId: string): Promise<Term[]> {
    const cacheKey = `terms:tree:${taxonomyId}`
    const cached = await this.cacheManager.get<Term[]>(cacheKey)
    if (cached) return cached

    const roots = await this.repo.findRoots()
    const filtered = roots.filter((t) => t.taxonomyId === taxonomyId)

    const result = await Promise.all(
      filtered.map((term) => this.repo.findDescendantsTree(term)),
    )
    await this.cacheManager.set(cacheKey, result)
    return result
  }

  async findOne(taxonomyId: string, slug: string): Promise<Term> {
    const cacheKey = `terms:one:${taxonomyId}:${slug}`
    const cached = await this.cacheManager.get<Term>(cacheKey)
    if (cached) return cached

    const term = await this.repo.findOne({ where: { slug, taxonomyId } })
    if (!term) {
      throw new NotFoundException(`Term "${slug}" not found in this taxonomy`)
    }
    await this.cacheManager.set(cacheKey, term)
    return term
  }

  async update(
    taxonomyId: string,
    slug: string,
    dto: UpdateTermDto,
  ): Promise<Term> {
    const term = await this.findOne(taxonomyId, slug)
    Object.assign(term, dto)
    const saved = await this.repo.save(term)
    await this.cacheManager.del(`terms:one:${taxonomyId}:${slug}`)
    await this.invalidateTermsCache(taxonomyId)
    return saved
  }

  async remove(taxonomyId: string, slug: string): Promise<void> {
    const term = await this.findOne(taxonomyId, slug)
    await this.repo.remove(term)
    await this.cacheManager.del(`terms:one:${taxonomyId}:${slug}`)
    await this.invalidateTermsCache(taxonomyId)
  }

  private async invalidateTermsCache(taxonomyId: string): Promise<void> {
    await this.cacheManager.del(`terms:flat:${taxonomyId}`)
    await this.cacheManager.del(`terms:tree:${taxonomyId}`)
  }
}
