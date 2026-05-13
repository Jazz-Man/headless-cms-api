import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { Permission } from '../entities/permission.entity'
import { Role } from '../entities/role.entity'
import { CreateRoleDto } from './dto/create-role.dto'
import { UpdateRoleDto } from './dto/update-role.dto'

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepo: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionRepo: Repository<Permission>,
  ) {}

  findAll(): Promise<Role[]> {
    return this.roleRepo.find({ order: { name: 'ASC' } })
  }

  async findOne(id: string): Promise<Role> {
    const role = await this.roleRepo.findOne({ where: { id } })
    if (!role) throw new NotFoundException(`Role "${id}" not found`)
    return role
  }

  findByName(name: string): Promise<Role | null> {
    return this.roleRepo.findOne({ where: { name } })
  }

  async create(dto: CreateRoleDto): Promise<Role> {
    const existing = await this.roleRepo.findOne({
      where: { name: dto.name },
    })
    if (existing) {
      throw new ConflictException(`Role "${dto.name}" already exists`)
    }

    const permissions = dto.permissionNames
      ? await this.findPermissionsByNames(dto.permissionNames)
      : []

    const role = this.roleRepo.create({
      isBuiltin: false,
      name: dto.name,
      permissions,
    })
    return this.roleRepo.save(role)
  }

  async update(id: string, dto: UpdateRoleDto): Promise<Role> {
    const role = await this.findOne(id)

    if (role.isBuiltin && dto.name && dto.name !== role.name) {
      throw new ConflictException('Cannot rename a built-in role')
    }

    if (dto.name) role.name = dto.name

    if (dto.permissionNames !== undefined) {
      role.permissions = await this.findPermissionsByNames(dto.permissionNames)
    }

    return this.roleRepo.save(role)
  }

  async remove(id: string): Promise<void> {
    const role = await this.findOne(id)
    if (role.isBuiltin) {
      throw new ConflictException('Cannot delete a built-in role')
    }
    await this.roleRepo.remove(role)
  }

  async getPermissionNamesForRole(roleName: string): Promise<string[]> {
    const role = await this.roleRepo.findOne({
      where: { name: roleName },
    })
    if (!role) return []
    return role.permissions.map((p) => p.name)
  }

  private async findPermissionsByNames(names: string[]): Promise<Permission[]> {
    const permissions = await this.permissionRepo.findBy(
      names.map((name) => ({ name })),
    )
    const found = permissions.map((p) => p.name)
    const missing = names.filter((n) => !found.includes(n))
    if (missing.length > 0) {
      throw new NotFoundException(
        `Permissions not found: ${missing.join(', ')}`,
      )
    }
    return permissions
  }

  // --- Seed helpers ---

  async seedPermission(
    name: string,
    description?: string,
  ): Promise<Permission> {
    const existing = await this.permissionRepo.findOne({ where: { name } })
    if (existing) return existing
    return this.permissionRepo.save(
      this.permissionRepo.create({ description, name }),
    )
  }

  async seedRole(name: string, permissionNames: string[]): Promise<Role> {
    const existing = await this.roleRepo.findOne({
      where: { name },
    })
    if (existing) {
      // Update permissions for existing built-in roles during seed
      const permissions = await this.permissionRepo.findBy(
        permissionNames.map((n) => ({ name: n })),
      )
      existing.permissions = permissions
      return this.roleRepo.save(existing)
    }
    const permissions = await this.permissionRepo.findBy(
      permissionNames.map((n) => ({ name: n })),
    )
    return this.roleRepo.save(
      this.roleRepo.create({
        isBuiltin: true,
        name,
        permissions,
      }),
    )
  }
}
