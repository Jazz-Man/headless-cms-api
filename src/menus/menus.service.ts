import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager'
import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Menu } from '../entities/menu.entity'
import { MenuItem } from '../entities/menu-item.entity'
import { CreateMenuDto } from './dto/create-menu.dto'
import { UpdateMenuDto } from './dto/update-menu.dto'

const LIST_CACHE_KEY = 'menus:list'

@Injectable()
export class MenusService {
  constructor(
    @InjectRepository(Menu)
    private readonly repo: Repository<Menu>,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(dto: CreateMenuDto): Promise<Menu> {
    const existing = await this.repo.findOne({ where: { slug: dto.slug } })
    if (existing) {
      throw new ConflictException(`Menu with slug "${dto.slug}" already exists`)
    }

    const menu = this.repo.create(dto)
    const saved = await this.repo.save(menu)
    await this.cacheManager.del(LIST_CACHE_KEY)
    return saved
  }

  async findAll(): Promise<Menu[]> {
    const cached = await this.cacheManager.get<Menu[]>(LIST_CACHE_KEY)
    if (cached) return cached

    const result = await this.repo.find({ order: { createdAt: 'DESC' } })
    await this.cacheManager.set(LIST_CACHE_KEY, result)
    return result
  }

  async findOne(slug: string): Promise<Menu> {
    const cacheKey = `menus:slug:${slug}`
    const cached = await this.cacheManager.get<Menu>(cacheKey)
    if (cached) return cached

    const menu = await this.repo.findOne({ where: { slug } })
    if (!menu) {
      throw new NotFoundException(`Menu "${slug}" not found`)
    }
    await this.cacheManager.set(cacheKey, menu)
    return menu
  }

  async getMenuTree(slug: string): Promise<Menu & { items: MenuItem[] }> {
    const cacheKey = `menus:tree:${slug}`
    const cached = await this.cacheManager.get<Menu & { items: MenuItem[] }>(
      cacheKey,
    )
    if (cached) return cached

    const menu = await this.findOne(slug)

    const items = await this.repo.manager.getRepository(MenuItem).find({
      order: { sortOrder: 'ASC' },
      where: { menuId: menu.id },
    })

    const tree = this.buildTree(items)
    const result = { ...menu, items: tree }
    await this.cacheManager.set(cacheKey, result)
    return result
  }

  async update(slug: string, dto: UpdateMenuDto): Promise<Menu> {
    const menu = await this.findOne(slug)
    Object.assign(menu, dto)
    const saved = await this.repo.save(menu)
    await this.cacheManager.del(`menus:slug:${slug}`)
    await this.cacheManager.del(`menus:tree:${slug}`)
    await this.cacheManager.del(LIST_CACHE_KEY)
    return saved
  }

  async remove(slug: string): Promise<void> {
    const menu = await this.findOne(slug)
    await this.repo.remove(menu)
    await this.cacheManager.del(`menus:slug:${slug}`)
    await this.cacheManager.del(`menus:tree:${slug}`)
    await this.cacheManager.del(LIST_CACHE_KEY)
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
