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

  @Roles(UserRole.ADMIN)
  @Post()
  create(@Body() dto: CreateMenuDto) {
    return this.service.create(dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch(':slug')
  update(@Param('slug') slug: string, @Body() dto: UpdateMenuDto) {
    return this.service.update(slug, dto)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':slug')
  remove(@Param('slug') slug: string) {
    return this.service.remove(slug)
  }
}
