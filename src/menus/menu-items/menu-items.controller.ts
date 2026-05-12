import { Body, Controller, Delete, Param, Patch, Post } from '@nestjs/common'
import { Roles } from '../../common/decorators/roles.decorator'
import { Menu } from '../../entities/menu.entity'
import { UserRole } from '../../entities/user.entity'
import { CreateMenuItemDto } from '../dto/create-menu-item.dto'
import { ReorderMenuItemsDto } from '../dto/reorder-menu-items.dto'
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto'
import { MenusService } from '../menus.service'
import { MenuItemsService } from './menu-items.service'

@Controller('menus/:slug/items')
export class MenuItemsController {
  constructor(
    private readonly menuItemsService: MenuItemsService,
    private readonly menusService: MenusService,
  ) {}

  private async resolveMenu(slug: string): Promise<Menu> {
    return await this.menusService.findOne(slug)
  }

  @Roles(UserRole.ADMIN)
  @Post()
  async create(@Param('slug') slug: string, @Body() dto: CreateMenuItemDto) {
    const menu = await this.resolveMenu(slug)
    return this.menuItemsService.create(slug, menu.id, dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch('reorder')
  reorder(@Body() dto: ReorderMenuItemsDto) {
    return this.menuItemsService.reorder(dto)
  }

  @Roles(UserRole.ADMIN)
  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateMenuItemDto) {
    return this.menuItemsService.update(id, dto)
  }

  @Roles(UserRole.ADMIN)
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.menuItemsService.remove(id)
  }
}
