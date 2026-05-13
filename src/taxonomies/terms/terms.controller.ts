import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { Permissions } from '../../common/decorators/permissions.decorator'
import { Public } from '../../common/decorators/public.decorator'
import { Taxonomy } from '../../entities/taxonomy.entity'
import { TaxonomiesService } from '../taxonomies.service'
import { CreateTermDto } from './dto/create-term.dto'
import { UpdateTermDto } from './dto/update-term.dto'
import { TermsService } from './terms.service'

@Controller('taxonomies/:taxonomySlug/terms')
export class TermsController {
  constructor(
    private readonly termsService: TermsService,
    private readonly taxonomiesService: TaxonomiesService,
  ) {}

  private async resolveTaxonomy(slug: string): Promise<Taxonomy> {
    return await this.taxonomiesService.findOne(slug)
  }

  @Public()
  @Get()
  async findAll(@Param('taxonomySlug') taxonomySlug: string) {
    const taxonomy = await this.resolveTaxonomy(taxonomySlug)
    if (taxonomy.type === 'hierarchical') {
      return this.termsService.findTree(taxonomy.id)
    }
    return this.termsService.findFlat(taxonomy.id)
  }

  @Public()
  @Get(':slug')
  async findOne(
    @Param('taxonomySlug') taxonomySlug: string,
    @Param('slug') slug: string,
  ) {
    const taxonomy = await this.resolveTaxonomy(taxonomySlug)
    return this.termsService.findOne(taxonomy.id, slug)
  }

  @Permissions('terms:manage')
  @Post()
  async create(
    @Param('taxonomySlug') taxonomySlug: string,
    @Body() dto: CreateTermDto,
  ) {
    const taxonomy = await this.resolveTaxonomy(taxonomySlug)
    return this.termsService.create(taxonomy.id, dto)
  }

  @Permissions('terms:manage')
  @Patch(':slug')
  async update(
    @Param('taxonomySlug') taxonomySlug: string,
    @Param('slug') slug: string,
    @Body() dto: UpdateTermDto,
  ) {
    const taxonomy = await this.resolveTaxonomy(taxonomySlug)
    return this.termsService.update(taxonomy.id, slug, dto)
  }

  @Permissions('terms:manage')
  @Delete(':slug')
  async remove(
    @Param('taxonomySlug') taxonomySlug: string,
    @Param('slug') slug: string,
  ) {
    const taxonomy = await this.resolveTaxonomy(taxonomySlug)
    return this.termsService.remove(taxonomy.id, slug)
  }
}
