import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { Public } from '../common/decorators/public.decorator'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../entities/user.entity'
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

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateTaxonomyDto) {
    return this.service.create(dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateTaxonomyDto) {
    return this.service.update(slug, dto)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.service.remove(slug)
  }
}
