import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Menu } from '../entities/menu.entity'
import { MenuItem } from '../entities/menu-item.entity'
import { CreateMenuDto } from './dto/create-menu.dto'
import { UpdateMenuDto } from './dto/update-menu.dto'

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(Menu)
    private readonly repo: Repository<Menu>,
  ) {}

  async create(dto: CreateMenuDto): Promise<Menu> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } })
    if (existing) {
      throw new ConflictException(`Menu with slug "${dto.slug}" already exists`)
    }

    const menu = this.repo.create(dto)
    return this.repo.save(menu)
  }

  async findAll(): Promise<Menu[]> {
    return await this.repo.find({ order: { createdAt: 'DESC' } })
  }

  async findOne(slug: string): Promise<Menu> {
    const menu = await this.repo.findOne({ where: { slug } })
    if (!menu) {
      throw new NotFoundException(`Menu "${slug}" not found`)
    }
    return menu
  }

  async getMenuTree(slug: string): Promise<Menu & { items: MenuItem[] }> {
    const menu = await this.findOne(slug)

    const items = await this.repo.manager.getRepository(MenuItem).find({
      order: { sortOrder: 'ASC' },
      where: { menuId: menu.id },
    })

    const tree = this.buildTree(items)
    return { ...menu, items: tree }
  }

  async update(slug: string, dto: UpdateMenuDto): Promise<Menu> {
    const menu = await this.findOne(slug)
    Object.assign(menu, dto)
    return this.repo.save(menu)
  }

  async remove(slug: string): Promise<void> {
    const menu = await this.findOne(slug)
    await this.repo.remove(menu)
  }

  private buildTree(items: MenuItem[]): MenuItem[] {
    const map = new Map<string, MenuItem & { children: MenuItem[] }>()
    const roots: (MenuItem & { children: MenuItem[] })[] = []

    for (const item of items) {
      map.set(item.id, { ...item, children: [] })
    }

    for (const item of items) {
      const node = map.get(item.id)!
      if (item.parentId && map.has(item.parentId)) {
        map.get(item.parentId)!.children.push(node)
      } else {
        roots.push(node)
      }
    }

    return roots.sort((a, b) => a.sortOrder - b.sortOrder)
  }
}
