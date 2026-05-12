import { Injectable, NotFoundException } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { MenuItem } from '../../entities/menu-item.entity'
import { CreateMenuItemDto } from '../dto/create-menu-item.dto'
import { ReorderMenuItemsDto } from '../dto/reorder-menu-items.dto'
import { UpdateMenuItemDto } from '../dto/update-menu-item.dto'

@Injectable()
export class MenuItemsService {
  constructor(
    @InjectRepository(MenuItem)
    private readonly repo: Repository<MenuItem>,
  ) {}

  async create(menuId: string, dto: CreateMenuItemDto): Promise<MenuItem> {
    const maxResult = await this.repo
      .createQueryBuilder('item')
      .select('MAX(item.sortOrder)', 'max')
      .where('item.menuId = :menuId', { menuId })
      .getRawOne()

    const sortOrder = (maxResult?.max ?? -1) + 1

    const item = this.repo.create({ ...dto, menuId, sortOrder })
    return this.repo.save(item)
  }

  async update(id: string, dto: UpdateMenuItemDto): Promise<MenuItem> {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) {
      throw new NotFoundException(`Menu item "${id}" not found`)
    }
    Object.assign(item, dto)
    return this.repo.save(item)
  }

  async remove(id: string): Promise<void> {
    const item = await this.repo.findOne({ where: { id } })
    if (!item) {
      throw new NotFoundException(`Menu item "${id}" not found`)
    }
    await this.repo.remove(item)
  }

  async reorder(dto: ReorderMenuItemsDto): Promise<void> {
    for (const item of dto.items) {
      await this.repo.update(item.id, {
        sortOrder: item.sortOrder,
        ...(item.parentId !== undefined && { parentId: item.parentId }),
      })
    }
  }
}
