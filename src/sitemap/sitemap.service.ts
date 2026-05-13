import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Content, ContentStatus } from '../entities/content.entity'
import { Taxonomy } from '../entities/taxonomy.entity'
import { Term } from '../entities/term.entity'

export interface SitemapUrl {
  changefreq: string
  lastmod: string
  loc: string
  priority: string
}

@Injectable()
export class SitemapService {
  constructor(
    @InjectRepository(Content)
    private readonly contentRepo: Repository<Content>,
    @InjectRepository(Taxonomy)
    private readonly taxonomyRepo: Repository<Taxonomy>,
    @InjectRepository(Term)
    private readonly termRepo: Repository<Term>,
    private readonly configService: ConfigService,
  ) {}

  async generateXml(): Promise<string> {
    const baseUrl =
      this.configService.get<string>('BASE_URL') ?? 'http://localhost:3000'

    const [contentUrls, termUrls] = await Promise.all([
      this.buildContentUrls(baseUrl),
      this.buildTermUrls(baseUrl),
    ])

    const urls = [...contentUrls, ...termUrls]
    const entries = urls.map((u) => this.formatUrl(u)).join('\n')

    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      entries,
      '</urlset>',
    ].join('\n')
  }

  private async buildContentUrls(baseUrl: string): Promise<SitemapUrl[]> {
    const items = await this.contentRepo.find({
      relations: ['contentType'],
      where: { status: ContentStatus.PUBLISHED },
    })

    return items.map((item) => ({
      changefreq: 'weekly',
      lastmod: item.updatedAt.toISOString(),
      loc: `${baseUrl}/${item.contentType.slug}/${item.slug}`,
      priority: '0.8',
    }))
  }

  private async buildTermUrls(baseUrl: string): Promise<SitemapUrl[]> {
    const taxonomies = await this.taxonomyRepo.find({
      relations: ['terms'],
    })

    const urls: SitemapUrl[] = []

    for (const taxonomy of taxonomies) {
      const terms = await this.termRepo.find({
        where: { taxonomyId: taxonomy.id },
      })

      for (const term of terms) {
        urls.push({
          changefreq: 'monthly',
          lastmod: term.createdAt.toISOString(),
          loc: `${baseUrl}/${taxonomy.slug}/${term.slug}`,
          priority: '0.5',
        })
      }
    }

    return urls
  }

  private formatUrl(entry: SitemapUrl): string {
    return [
      '  <url>',
      `    <loc>${escapeXml(entry.loc)}</loc>`,
      `    <lastmod>${entry.lastmod}</lastmod>`,
      `    <changefreq>${entry.changefreq}</changefreq>`,
      `    <priority>${entry.priority}</priority>`,
      '  </url>',
    ].join('\n')
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}
