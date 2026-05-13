import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Content } from '../entities/content.entity'
import { Revision } from '../entities/revision.entity'
import { User } from '../entities/user.entity'

@Injectable()
export class RevisionsService {
  constructor(
    @InjectRepository(Revision)
    private readonly revisionRepo: Repository<Revision>,
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
  ) {}

  async createRevision(contentId: string, userId?: string): Promise<Revision> {
    const content = await this.contentRepo.findOne({
      relations: ['contentType', 'author'],
      where: { id: contentId },
    })
    if (!content) {
      throw new NotFoundException(`Content with id "${contentId}" not found`)
    }

    const lastRevision = await this.revisionRepo.findOne({
      order: { revisionNumber: 'DESC' },
      where: { content: { id: contentId } },
    })

    const nextNumber = lastRevision ? lastRevision.revisionNumber + 1 : 1

    const snapshot: Record<string, unknown> = {
      bodyJsonb: content.bodyJsonb,
      excerpt: content.excerpt,
      slug: content.slug,
      status: content.status,
      title: content.title,
    }

    const revision = new Revision()
    revision.content = { id: contentId } as Content
    revision.createdBy = userId ? ({ id: userId } as User) : null
    revision.revisionNumber = nextNumber
    revision.snapshot = snapshot

    return this.revisionRepo.save(revision)
  }

  async findByContent(
    contentId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: Revision[]
    total: number
    page: number
    limit: number
  }> {
    const [items, total] = await this.revisionRepo.findAndCount({
      order: { revisionNumber: 'DESC' },
      relations: ['createdBy'],
      skip: (page - 1) * limit,
      take: limit,
      where: { content: { id: contentId } },
    })

    return { items, limit, page, total }
  }

  async findOne(contentId: string, revisionNumber: number): Promise<Revision> {
    const revision = await this.revisionRepo.findOne({
      relations: ['createdBy'],
      where: {
        content: { id: contentId },
        revisionNumber,
      },
    })
    if (!revision) {
      throw new NotFoundException(
        `Revision ${revisionNumber} not found for content "${contentId}"`,
      )
    }
    return revision
  }

  async restore(
    contentId: string,
    revisionNumber: number,
    userId: string,
  ): Promise<Content> {
    const revision = await this.findOne(contentId, revisionNumber)

    // Create a revision of the current state before restoring
    await this.createRevision(contentId, userId)

    const content = await this.contentRepo.findOne({
      where: { id: contentId },
    })
    if (!content) {
      throw new NotFoundException(`Content with id "${contentId}" not found`)
    }

    const snap = revision.snapshot
    if (typeof snap.title === 'string') content.title = snap.title
    if (typeof snap.slug === 'string') content.slug = snap.slug
    if (typeof snap.excerpt === 'string' || snap.excerpt === null) {
      content.excerpt = snap.excerpt as typeof content.excerpt
    }
    if (snap.bodyJsonb !== undefined) {
      content.bodyJsonb = snap.bodyJsonb as Record<string, unknown>
    }
    if (typeof snap.status === 'string') {
      content.status = snap.status as Content['status']
    }

    return this.contentRepo.save(content)
  }
}
