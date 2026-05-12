import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common'
import { Roles } from '../common/decorators/roles.decorator'
import { UserRole } from '../entities/user.entity'
import { ContentTypesService } from './content-types.service'
import { CreateContentTypeDto } from './dto/create-content-type.dto'
import { UpdateContentTypeDto } from './dto/update-content-type.dto'

@Controller('content-types')
@Roles(UserRole.ADMIN)
export class ContentTypesController {
  constructor(private readonly service: ContentTypesService) {}

  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.service.findOne(slug)
  }

  @Post()
  create(@Body() dto: CreateContentTypeDto) {
    return this.service.create(dto)
  }

  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateContentTypeDto) {
    return this.service.update(slug, dto)
  }

  @Delete(':slug')
  async remove(@Param('slug') slug: string) {
    await this.service.remove(slug)
    return { message: `Content type "${slug}" deleted` }
  }
}
