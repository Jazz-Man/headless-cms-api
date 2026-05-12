import {
  ForbiddenException,
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
import { SeoService } from '../seo/seo.service'
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

    return this.findOneById(saved.id)
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
    return { items, limit, page, total }
  }

  async findOneBySlug(slug: string): Promise<Content> {
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

    return Object.assign(content, { seo, terms })
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

    return this.findOneById(id)
  }

  async archive(id: string): Promise<Content> {
    const content = await this.contentRepo.findOne({ where: { id } })
    if (!content) {
      throw new NotFoundException(`Content with id "${id}" not found`)
    }
    content.status = ContentStatus.ARCHIVED
    return this.contentRepo.save(content)
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
