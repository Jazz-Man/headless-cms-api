import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import { Inject, Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Menu } from '../../entities/menu.entity'
import { MenuItem } from '../../entities/menu-item.entity'
import { CreateMenuItemDto } from '../dto/create-menu-item.dto'
import { ReorderMenuItemsDto } from '../dto/reorder-menu-items.dto'
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto'

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly repo: Repository<MenuItem>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(
    menuSlug: string,
    menuId: string,
    dto: CreateMenuItemDto,
  ): Promise<MenuItem> {
    const maxResult = await this.repo
      .createQueryBuilder('item')
      .select('MAX(item.sortOrder)', 'max')
      .where('item.menuId = :menuId', { menuId })
      .getRawOne()

    const sortOrder = (maxResult?.max ?? -1) + 1

    const item = this.repo.create({ ...dto, menuId, sortOrder })
    const saved = await this.repo.save(item)
    await this.cacheManager.del(`menus:tree:${menuSlug}`)
    return saved
  }

  async update(id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) {
      throw new NotFoundException(`Menu item "${id}" not found`)
    }
    Object.assign(item, dto)
    const saved = await this.repo.save(item)
    await this.invalidateTreeByItemId(item.menuId)
    return saved
  }

  async remove(id: string): Promise<void> {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) {
      throw new NotFoundException(`Menu item "${id}" not found`)
    }
    await this.repo.remove(item)
    await this.invalidateTreeByItemId(item.menuId)
  }

  async reorder(dto: ReorderMenuItemsDto): Promise<void> {
    for (const item of dto.items) {
      await this.repo.update(item.id, {
        sortOrder: item.sortOrder,
        ...(item.parentId !== undefined && { parentId: item.parentId }),
      })
    }
    if (dto.items.length > 0) {
      const first = await this.repo.findOne({
        where: { id: dto.items[0].id },
      })
      if (first) {
        await this.invalidateTreeByItemId(first.menuId)
      }
    }
  }

  private async invalidateTreeByItemId(menuId: string): Promise<void> {
    const menu = await this.repo.manager
      .getRepository(Menu)
      .findOne({ where: { id: menuId } })
    if (menu) {
      await this.cacheManager.del(`menus:tree:${menu.slug}`)
    }
  }
}
