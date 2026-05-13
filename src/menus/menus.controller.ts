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
import { CreateMenuDto } from './dto/create-menu.dto'
import { UpdateMenuDto } from './dto/update-menu.dto'
import { MenusService } from './menus.service'

@Controller('menus')
export class MenusController {
  constructor(private readonly service: MenusService) {}

  @Public()
  @Get()
  findAll() {
    return this.service.findAll()
  }

  @Public()
  @Get(':slug')
  findOne(@Param('slug') slug: string) {
    return this.service.getMenuTree(slug)
  }

  @Permissions('menus:manage')
  @Post()
  create(@Body() dto: CreateMenuDto) {
    return this.service.create(dto)
  }

  @Permissions('menus:manage')
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateMenuDto) {
    return this.service.update(slug, dto)
  }

  @Permissions('menus:manage')
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.service.remove(slug)
  }
}
