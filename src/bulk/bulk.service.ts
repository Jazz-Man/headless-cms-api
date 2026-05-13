import { Injectable } from '@nestjs/common'
import { ContentsService } from '../contents/contents.service'
import { TaxonomiesService } from '../taxonomies/taxonomies.service'
import { TermsService } from '../taxonomies/terms/terms.service'
import {
  BulkContentAction,
  BulkContentsDto,
  BulkCreateItemDto,
  BulkDeleteItemDto,
  BulkUpdateItemDto,
} from './dto/bulk-contents.dto'
import { BulkTermItemDto } from './dto/bulk-terms.dto'

export interface BulkResultItem {
  error?: string
  id?: string
  success: boolean
}

export interface BulkResult {
  failed: number
  items: BulkResultItem[]
  succeeded: number
  total: number
}

@Injectable()
export class BulkService {
  constructor(
    private readonly contentsService: ContentsService,
    private readonly taxonomiesService: TaxonomiesService,
    private readonly termsService: TermsService,
  ) {}

  async bulkContents(
    authorId: string,
    authorRole: string,
    dto: BulkContentsDto,
  ): Promise<BulkResult> {
    switch (dto.action) {
      case BulkContentAction.CREATE:
        return await this.bulkCreateContents(
          authorId,
          dto.items as BulkCreateItemDto[],
        )
      case BulkContentAction.UPDATE:
        return await this.bulkUpdateContents(
          authorId,
          authorRole,
          dto.items as BulkUpdateItemDto[],
        )
      case BulkContentAction.DELETE:
        return await this.bulkDeleteContents(dto.items as BulkDeleteItemDto[])
      default:
        return {
          failed: 0,
          items: [],
          succeeded: 0,
          total: 0,
        }
    }
  }

  private async bulkCreateContents(
    authorId: string,
    items: BulkCreateItemDto[],
  ): Promise<BulkResult> {
    const results: BulkResultItem[] = []

    for (const item of items) {
      try {
        const content = await this.contentsService.create(authorId, {
          bodyJsonb: item.bodyJsonb,
          excerpt: item.excerpt,
          seo: item.seo,
          slug: item.slug,
          termIds: item.termIds,
          title: item.title,
          typeSlug: item.typeSlug,
        })
        results.push({ id: content.id, success: true })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.push({ error: message, success: false })
      }
    }

    return this.buildResult(results)
  }

  private async bulkUpdateContents(
    userId: string,
    userRole: string,
    items: BulkUpdateItemDto[],
  ): Promise<BulkResult> {
    const results: BulkResultItem[] = []

    for (const item of items) {
      try {
        const content = await this.contentsService.update(
          item.id,
          {
            bodyJsonb: item.bodyJsonb,
            excerpt: item.excerpt,
            seo: item.seo,
            slug: item.slug,
            status: item.status,
            termIds: item.termIds,
            title: item.title,
          },
          userId,
          userRole,
        )
        results.push({ id: content.id, success: true })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.push({ error: message, id: item.id, success: false })
      }
    }

    return this.buildResult(results)
  }

  private async bulkDeleteContents(
    items: BulkDeleteItemDto[],
  ): Promise<BulkResult> {
    const results: BulkResultItem[] = []

    for (const item of items) {
      try {
        const content = await this.contentsService.archive(item.id)
        results.push({ id: content.id, success: true })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.push({ error: message, id: item.id, success: false })
      }
    }

    return this.buildResult(results)
  }

  async bulkCreateTerms(
    taxonomySlug: string,
    items: BulkTermItemDto[],
  ): Promise<BulkResult> {
    const taxonomy = await this.taxonomiesService.findOne(taxonomySlug)
    const results: BulkResultItem[] = []

    for (const item of items) {
      try {
        const term = await this.termsService.create(taxonomy.id, {
          description: item.description,
          name: item.name,
          parentId: item.parentId,
          slug: item.slug,
        })
        results.push({ id: term.id, success: true })
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        results.push({ error: message, success: false })
      }
    }

    return this.buildResult(results)
  }

  private buildResult(items: BulkResultItem[]): BulkResult {
    const succeeded = items.filter((i) => i.success).length
    return {
      failed: items.length - succeeded,
      items,
      succeeded,
      total: items.length,
    }
  }
}
