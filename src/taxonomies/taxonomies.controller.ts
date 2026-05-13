import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { Permissions } from '../common/decorators/permissions.decorator'
import { Public } from '../common/decorators/public.decorator'
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto'
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto'
import { TaxonomiesService } from './taxonomies.service'

@Controller('taxonomies')
export class TaxonomiesController {
  constructor(private readonly service: TaxonomiesService) {}

  @Public()
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Permissions('terms:manage')
  @Post()
  create(@Body() dto: CreateTaxonomyDto) {
    return this.service.create(dto)
  }

  @Permissions('terms:manage')
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateTaxonomyDto) {
    return this.service.update(slug, dto)
  }

  @Permissions('terms:manage')
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.service.remove(slug)
  }
}
