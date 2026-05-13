import { Controller, Get, Header } from '@nestjs/common'
import { Public } from '../common/decorators/public.decorator'
import { SitemapService } from './sitemap.service'

@Controller()
export class SitemapController {
  constructor(private readonly sitemapService: SitemapService) {}

  @Public()
  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml')
  getSitemap(): Promise<string> {
    return this.sitemapService.generateXml()
  }
}
