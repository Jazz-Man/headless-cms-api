import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import {
  ForbiddenException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { ContentTypesService } from '../content-types/content-types.service'
import { Content, ContentStatus } from '../entities/content.entity'
import { ContentTerm } from '../entities/content-term.entity'
import { SeoEntityType } from '../entities/seo-meta.entity'
import { Term } from '../entities/term.entity'
import { UserRole } from '../entities/user.entity'
import { RevisionsService } from '../revisions/revisions.service'
import { SeoService } from '../seo/seo.service'
import { WebhooksService } from '../webhooks/webhooks.service'
import { CreateContentDto } from './dto/create-content.dto'
import { QueryContentsDto } from './dto/query-contents.dto'
import { UpdateContentDto } from './dto/update-content.dto'

@Injectable()
export class ContentsService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
    @InjectRepository(ContentTerm)
    private readonly contentTermRepo: Repository<ContentTerm>,
    private readonly seoService: SeoService,
    private readonly contentTypesService: ContentTypesService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    @Inject(forwardRef(() => WebhooksService))
    private readonly webhooksService: WebhooksService,
    @Inject(forwardRef(() => RevisionsService))
    private readonly revisionsService: RevisionsService,
  ) {}

  async create(authorId: string, dto: CreateContentDto): Promise<Content> {
    const contentType = await this.contentTypesService.findOne(dto.typeSlug)

    const content = new Content()
    content.title = dto.title
    content.slug = dto.slug || this.slugify(dto.title)
    content.typeId = contentType.id
    content.contentType = contentType
    content.excerpt = (dto.excerpt ?? undefined) as string
    content.bodyJsonb = (dto.bodyJsonb ?? undefined) as Record<string, unknown>
    content.status = ContentStatus.DRAFT
    content.authorId = authorId

    const saved = await this.contentRepo.save(content)

    if (dto.termIds?.length) {
      await this.syncTerms(saved.id, dto.termIds)
    }

    if (dto.seo) {
      await this.seoService.upsert(SeoEntityType.CONTENT, saved.id, dto.seo)
    }

    await this.invalidateContentListCache(dto.typeSlug)
    await this.invalidateContentListCache()
    const result = await this.findOneById(saved.id)

    // Fire webhook asynchronously — don't await
    this.webhooksService
      .fireEvent('content.created', {
        contentId: result.id,
        slug: result.slug,
        status: result.status,
        title: result.title,
        typeSlug: dto.typeSlug,
      })
      .catch(() => {
        // Intentionally swallowed — webhook failures must not block
        // the content operation
      })

    return result
  }

  async findPublished(query: QueryContentsDto) {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      search,
      sort = '-publishedAt',
    } = query

    const version = await this.getListCacheVersion(type)
    const cacheKey = `contents:list:${type ?? 'all'}:v${version}:${page}:${limit}:${status ?? 'published'}:${sort}`
    const cached = await this.cacheManager.get(cacheKey)
    if (cached) return cached

    const qb = this.contentRepo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.contentType', 'ct')
      .leftJoinAndSelect('c.author', 'a')

    qb.where('1=1')

    if (type) {
      qb.andWhere('ct.slug = :type', { type })
    }

    if (status) {
      qb.andWhere('c.status = :status', { status })
    } else {
      qb.andWhere('c.status = :status', { status: ContentStatus.PUBLISHED })
    }

    if (search) {
      qb.andWhere('(c.title ILIKE :search OR c.excerpt ILIKE :search)', {
        search: `%${search}%`,
      })
    }

    const sortField = sort.startsWith('-') ? sort.slice(1) : sort
    const sortDir = sort.startsWith('-') ? 'DESC' : 'ASC'
    const allowedFields = ['publishedAt', 'createdAt', 'updatedAt', 'title']
    const field = allowedFields.includes(sortField)
      ? `c.${sortField}`
      : 'c.publishedAt'
    qb.orderBy(field, sortDir as 'ASC' | 'DESC')

    const skip = (page - 1) * limit
    qb.skip(skip).take(limit)

    const [items, total] = await qb.getManyAndCount()
    const result = { items, limit, page, total }
    await this.cacheManager.set(cacheKey, result)
    return result
  }

  async findOneBySlug(slug: string): Promise<Content> {
    const cacheKey = `contents:slug:${slug}`
    const cached = await this.cacheManager.get(cacheKey)
    if (cached) return cached as Content

    const content = await this.contentRepo.findOne({
      relations: ['contentType', 'author'],
      where: { slug },
    })
    if (!content) {
      throw new NotFoundException(`Content with slug "${slug}" not found`)
    }

    const [seo, terms] = await Promise.all([
      this.seoService.find(SeoEntityType.CONTENT, content.id),
      this.getTerms(content.id),
    ])

    const result = Object.assign(content, { seo, terms })
    await this.cacheManager.set(cacheKey, result)
    return result
  }

  async update(
    id: string,
    dto: UpdateContentDto,
    userId: string,
    userRole: UserRole,
  ): Promise<Content> {
    const content = await this.findOneById(id)

    if (userRole !== UserRole.ADMIN && content.authorId !== userId) {
      throw new ForbiddenException('You can only edit your own content')
    }

    // Create a revision snapshot before applying the update
    await this.revisionsService.createRevision(id, userId)

    const wasDraft = content.status !== ContentStatus.PUBLISHED
    if (dto.title !== undefined) content.title = dto.title
    if (dto.slug !== undefined) content.slug = dto.slug
    if (dto.excerpt !== undefined) content.excerpt = dto.excerpt
    if (dto.bodyJsonb !== undefined) content.bodyJsonb = dto.bodyJsonb
    if (dto.status !== undefined) content.status = dto.status

    if (
      dto.status === ContentStatus.PUBLISHED &&
      wasDraft &&
      !content.publishedAt
    ) {
      content.publishedAt = new Date()
    }

    await this.contentRepo.save(content)

    if (dto.termIds !== undefined) {
      await this.syncTerms(id, dto.termIds)
    }

    if (dto.seo) {
      await this.seoService.upsert(SeoEntityType.CONTENT, id, dto.seo)
    }

    await this.cacheManager.del(`contents:slug:${content.slug}`)
    if (dto.slug && dto.slug !== content.slug) {
      await this.cacheManager.del(`contents:slug:${dto.slug}`)
    }
    await this.invalidateContentListCache()
    const result = await this.findOneById(id)

    // Fire webhook asynchronously — don't await
    const event =
      dto.status === ContentStatus.PUBLISHED && wasDraft
        ? 'content.published'
        : 'content.updated'
    this.webhooksService
      .fireEvent(event, {
        contentId: result.id,
        slug: result.slug,
        status: result.status,
        title: result.title,
      })
      .catch(() => {
        // Intentionally swallowed — webhook failures must not block
        // the content operation
      })

    return result
  }

  async archive(id: string): Promise<Content> {
    const content = await this.contentRepo.findOne({ where: { id } })
    if (!content) {
      throw new NotFoundException(`Content with id "${id}" not found`)
    }
    content.status = ContentStatus.ARCHIVED
    const saved = await this.contentRepo.save(content)
    await this.cacheManager.del(`contents:slug:${content.slug}`)
    await this.invalidateContentListCache()

    // Fire webhook asynchronously — don't await
    this.webhooksService
      .fireEvent('content.deleted', {
        contentId: saved.id,
        slug: saved.slug,
        title: saved.title,
      })
      .catch(() => {
        // Intentionally swallowed — webhook failures must not block
        // the content operation
      })

    return saved
  }

  private async findOneById(id: string): Promise<Content> {
    const content = await this.contentRepo.findOne({
      relations: ['contentType', 'author'],
      where: { id },
    })
    if (!content) {
      throw new NotFoundException(`Content with id "${id}" not found`)
    }

    const [seo, terms] = await Promise.all([
      this.seoService.find(SeoEntityType.CONTENT, id),
      this.getTerms(id),
    ])

    return Object.assign(content, { seo, terms })
  }

  private async invalidateContentListCache(typeSlug?: string): Promise<void> {
    const key = `contents:list:version:${typeSlug ?? 'all'}`
    const version = await this.cacheManager.get<number>(key)
    const next = (version ?? 0) + 1
    await this.cacheManager.set(key, next, 86400000)
  }

  private async getListCacheVersion(typeSlug?: string): Promise<number> {
    const key = `contents:list:version:${typeSlug ?? 'all'}`
    const version = await this.cacheManager.get<number>(key)
    return version ?? 0
  }

  private async syncTerms(contentId: string, termIds: string[]): Promise<void> {
    await this.contentTermRepo.delete({ contentId })
    if (termIds.length > 0) {
      const rows = termIds.map((termId) =>
        this.contentTermRepo.create({ contentId, termId }),
      )
      await this.contentTermRepo.save(rows)
    }
  }

  private async getTerms(contentId: string): Promise<Term[]> {
    const links = await this.contentTermRepo.find({
      relations: ['term'],
      where: { contentId },
    })
    return links.map((l) => l.term)
  }

  private slugify(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
  }
}
